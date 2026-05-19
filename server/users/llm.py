import http.client
import json
import threading
from dataclasses import dataclass, field
from urllib import parse

from django.conf import settings


class LLMServiceError(Exception):
    pass


class LLMRequestCancelled(Exception):
    pass


@dataclass
class ActiveLLMRequest:
    cancelled: threading.Event = field(default_factory=threading.Event)
    connection: http.client.HTTPConnection | http.client.HTTPSConnection | None = None
    lock: threading.Lock = field(default_factory=threading.Lock)

    def bind_connection(self, connection):
        with self.lock:
            if self.cancelled.is_set():
                connection.close()
                raise LLMRequestCancelled('Генерация остановлена пользователем.')
            self.connection = connection

    def release_connection(self, connection):
        with self.lock:
            if self.connection is connection:
                self.connection = None

    def cancel(self):
        with self.lock:
            self.cancelled.set()
            if self.connection is not None:
                self.connection.close()


_ACTIVE_LLM_REQUESTS = {}
_ACTIVE_LLM_REQUESTS_LOCK = threading.Lock()


def _register_request(request_id):
    if not request_id:
        return None

    active_request = ActiveLLMRequest()
    with _ACTIVE_LLM_REQUESTS_LOCK:
        _ACTIVE_LLM_REQUESTS[request_id] = active_request
    return active_request


def _unregister_request(request_id, active_request):
    if not request_id or active_request is None:
        return

    with _ACTIVE_LLM_REQUESTS_LOCK:
        if _ACTIVE_LLM_REQUESTS.get(request_id) is active_request:
            _ACTIVE_LLM_REQUESTS.pop(request_id, None)


def cancel_chat(request_id):
    if not request_id:
        return False

    with _ACTIVE_LLM_REQUESTS_LOCK:
        active_request = _ACTIVE_LLM_REQUESTS.get(request_id)

    if active_request is None:
        return False

    active_request.cancel()
    return True


def _normalize_role(role):
    if role == 'bot':
        return 'assistant'
    if role in {'assistant', 'user', 'system'}:
        return role
    return 'user'


def _format_attachment_note(attachments):
    if not isinstance(attachments, list) or not attachments:
        return ''

    parts = []
    for item in attachments:
        if not isinstance(item, dict):
            continue
        name = (item.get('name') or 'file').strip()
        size = item.get('size')
        file_type = (item.get('type') or 'file').strip()
        meta = [file_type]
        if isinstance(size, (int, float)):
            meta.append(f'{int(size)} bytes')
        parts.append(f'- {name} ({", ".join(meta)})')

    if not parts:
        return ''

    return 'Пользователь приложил файл, но сервер пока не передаёт его содержимое в модель:\n' + '\n'.join(parts)


def normalize_messages(messages):
    normalized = []

    for item in messages:
        if not isinstance(item, dict):
            continue

        text = (item.get('text') or item.get('content') or '').strip()
        attachment_note = _format_attachment_note(item.get('attachments'))
        content_parts = [part for part in (text, attachment_note) if part]
        if not content_parts:
            continue

        normalized.append({
            'role': _normalize_role(item.get('role')),
            'content': '\n\n'.join(content_parts),
        })

    if not normalized:
        return []

    sanitized = []

    for message in normalized:
        role = message['role']
        content = message['content']

        if role == 'system':
            if sanitized and sanitized[-1]['role'] == 'system':
                sanitized[-1]['content'] = f"{sanitized[-1]['content']}\n\n{content}"
            elif sanitized:
                sanitized.append({'role': 'user', 'content': content})
            else:
                sanitized.append(message)
            continue

        if not sanitized:
            if role == 'assistant':
                continue
            sanitized.append(message)
            continue

        if sanitized[-1]['role'] == role:
            sanitized[-1]['content'] = f"{sanitized[-1]['content']}\n\n{content}"
            continue

        sanitized.append(message)

    while sanitized and sanitized[0]['role'] == 'assistant':
        sanitized.pop(0)

    return sanitized


def _build_system_message():
    return {
        'role': 'system',
        'content': (
            'Отвечай по существу и не дублируй уже выданный текст. '
            'Если пользователь просит код, сначала дай готовый код. '
            'Не добавляй вводные фразы вроде "Конечно" или "Вот продолжение", '
            'если тебя просят продолжить ответ. '
            'При продолжении возвращай только новый текст с точки обрыва.'
        ),
    }


def _looks_incomplete(text, finish_reason):
    if finish_reason == 'length':
        return True

    clean = (text or '').rstrip()
    if not clean:
        return False

    if clean.count('```') % 2 != 0:
        return True

    return clean.endswith(('(', '[', '{', ':', ',', '+', '-', '*', '/', '='))


def _trim_repeated_continuation(previous_text, chunk, *, min_overlap=64):
    previous = (previous_text or '').strip()
    current = (chunk or '').strip()
    if not previous or not current:
        return current

    if current == previous or current in previous:
        return ''

    if current.startswith(previous):
        return current[len(previous):].lstrip()

    max_overlap = min(len(previous), len(current))

    # Common failure mode: the model adds a short preamble and then restarts
    # from a suffix of the already generated answer.
    for size in range(max_overlap, min_overlap - 1, -1):
        suffix = previous[-size:]
        pos = current.find(suffix)
        if pos >= 0:
            trimmed = current[pos + size:].lstrip()
            if trimmed:
                return trimmed

    for size in range(max_overlap, min_overlap - 1, -1):
        prefix = current[:size]
        if prefix in previous:
            trimmed = current[size:].lstrip()
            if trimmed:
                return trimmed

    return current


def _extract_choice(data):
    try:
        choice = data['choices'][0]
        content = choice['message']['content'].strip()
        finish_reason = choice.get('finish_reason')
        return content, finish_reason
    except (KeyError, IndexError, AttributeError) as exc:
        raise LLMServiceError('LLM backend вернул ответ в неожиданном формате.') from exc


def _extract_stream_delta(data):
    try:
        choice = data['choices'][0]
        delta = choice.get('delta') or {}
        content = delta.get('content') or ''
        if not isinstance(content, str):
            raise TypeError('delta.content must be a string')
        finish_reason = choice.get('finish_reason')
        return content, finish_reason
    except (KeyError, IndexError, AttributeError, TypeError) as exc:
        raise LLMServiceError('LLM backend вернул stream-ответ в неожиданном формате.') from exc


def _extract_upstream_stream_error(data):
    error_payload = data.get('error')
    if isinstance(error_payload, dict):
        message = error_payload.get('message')
        if message:
            return str(message)
    if error_payload:
        return str(error_payload)
    return 'LLM backend вернул ошибку в stream-ответе.'


def _collect_stream_response(response, active_request=None):
    parts = []
    finish_reason = None
    saw_done = False

    while True:
        raw_line = response.readline()
        if not raw_line:
            if active_request and active_request.cancelled.is_set():
                raise LLMRequestCancelled('Генерация остановлена пользователем.')
            break

        line = raw_line.decode('utf-8', errors='ignore').strip()
        if not line or not line.startswith('data:'):
            continue

        payload = line[5:].strip()
        if payload == '[DONE]':
            saw_done = True
            break

        try:
            data = json.loads(payload)
        except json.JSONDecodeError as exc:
            raise LLMServiceError('LLM backend вернул невалидный stream JSON.') from exc

        if 'error' in data:
            raise LLMServiceError(_extract_upstream_stream_error(data))

        content, maybe_finish_reason = _extract_stream_delta(data)
        if content:
            parts.append(content)
        if maybe_finish_reason is not None:
            finish_reason = maybe_finish_reason

    if not saw_done and active_request and active_request.cancelled.is_set():
        raise LLMRequestCancelled('Генерация остановлена пользователем.')

    return ''.join(parts).strip(), finish_reason


def _build_endpoint(base_url):
    parsed = parse.urlparse(base_url)
    if parsed.scheme not in {'http', 'https'}:
        raise LLMServiceError(f'Неподдерживаемая схема LLM_BASE_URL: {parsed.scheme or "(empty)"}')

    base_path = parsed.path.rstrip('/')
    endpoint = f'{base_path}/v1/chat/completions' if base_path else '/v1/chat/completions'
    port = parsed.port or (443 if parsed.scheme == 'https' else 80)
    return parsed.scheme, parsed.hostname, port, endpoint


def _request_completion(messages, *, deep_mode=False, active_request=None):
    normalized_messages = normalize_messages(messages)
    if not normalized_messages:
        raise LLMServiceError('Нет сообщений для отправки в модель.')

    model_messages = [_build_system_message(), *normalized_messages]

    base_url = settings.LLM_BASE_URL.rstrip('/')
    scheme, host, port, endpoint = _build_endpoint(base_url)
    payload = {
        'messages': model_messages,
        'stream': True,
        'temperature': 0.6 if deep_mode else 0.3,
        'max_tokens': settings.LLM_DEEP_MAX_TOKENS if deep_mode else settings.LLM_MAX_TOKENS,
    }

    if settings.LLM_UPSTREAM_MODEL:
        payload['model'] = settings.LLM_UPSTREAM_MODEL

    headers = {
        'Content-Type': 'application/json',
    }
    if settings.LLM_API_KEY:
        headers['Authorization'] = f'Bearer {settings.LLM_API_KEY}'

    payload_bytes = json.dumps(payload).encode('utf-8')
    connection_class = http.client.HTTPSConnection if scheme == 'https' else http.client.HTTPConnection
    connection = connection_class(host, port, timeout=settings.LLM_TIMEOUT_SECONDS)

    try:
        if active_request and active_request.cancelled.is_set():
            raise LLMRequestCancelled('Генерация остановлена пользователем.')

        if active_request:
            active_request.bind_connection(connection)

        connection.request('POST', endpoint, body=payload_bytes, headers=headers)
        response = connection.getresponse()
        if response.status >= 400:
            body = response.read()
            detail = body.decode('utf-8', errors='ignore')
            raise LLMServiceError(f'LLM backend вернул HTTP {response.status}: {detail or response.reason}')

        content, finish_reason = _collect_stream_response(response, active_request=active_request)
    except LLMRequestCancelled:
        raise
    except (TimeoutError, OSError, http.client.HTTPException) as exc:
        if active_request and active_request.cancelled.is_set():
            raise LLMRequestCancelled('Генерация остановлена пользователем.') from exc
        raise LLMServiceError(
            f'Не удалось подключиться к LLM backend по адресу {endpoint}. '
            f'Проверьте, что llama-server запущен.'
        ) from exc
    finally:
        if active_request:
            active_request.release_connection(connection)
        connection.close()

    return content, finish_reason


def complete_chat(messages, *, deep_mode=False, request_id=None):
    normalized_messages = normalize_messages(messages)
    answer_parts = []
    current_messages = list(normalized_messages)
    active_request = _register_request(request_id)

    try:
        for _ in range(settings.LLM_MAX_CONTINUATIONS + 1):
            if active_request and active_request.cancelled.is_set():
                raise LLMRequestCancelled('Генерация остановлена пользователем.')

            chunk, finish_reason = _request_completion(
                current_messages,
                deep_mode=deep_mode,
                active_request=active_request,
            )
            previous_answer = '\n'.join(answer_parts).strip()
            chunk = _trim_repeated_continuation(previous_answer, chunk)
            if not chunk:
                break

            answer_parts.append(chunk)
            combined = '\n'.join(answer_parts).strip()

            if not _looks_incomplete(combined, finish_reason):
                return combined

            current_messages = [
                *normalized_messages,
                {'role': 'assistant', 'content': combined},
                {
                    'role': 'user',
                    'content': (
                        'Продолжи строго с места обрыва. '
                        'Верни только новый текст без вступления, без пояснений '
                        'и без повторения уже выданных строк. '
                        'Если открыт блок кода, сначала закончи его и закрой ```.'
                    ),
                },
            ]

        return '\n'.join(answer_parts).strip()
    finally:
        _unregister_request(request_id, active_request)
