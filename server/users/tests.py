from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch

from .llm import _collect_stream_response, _looks_incomplete, complete_chat, normalize_messages


class AuthChatFlowTests(APITestCase):
    def register_user(self):
        response = self.client.post(
            reverse('register'),
            {
                'username': 'tester',
                'email': 'tester@example.com',
                'password': 'strong-password-123',
                'password2': 'strong-password-123',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        return response.data

    def authenticate(self):
        tokens = self.register_user()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        return tokens

    def test_user_can_register_and_manage_chats(self):
        self.authenticate()

        profile_response = self.client.get(reverse('profile'))
        self.assertEqual(profile_response.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_response.data['username'], 'tester')

        list_response = self.client.get(reverse('chat-list'))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data, [])

        folder_response = self.client.post(
            reverse('folder-list'),
            {'name': 'Курсовые'},
            format='json',
        )
        self.assertEqual(folder_response.status_code, status.HTTP_201_CREATED)
        folder_id = folder_response.data['id']

        create_response = self.client.post(
            reverse('chat-list'),
            {
                'name': 'Первый чат',
                'folder': folder_id,
                'messages': [{'id': '1', 'role': 'user', 'text': 'Привет'}],
                'model': 'gpt-4o',
                'deep_mode': True,
            },
            format='json',
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        chat_id = create_response.data['id']
        self.assertEqual(create_response.data['folder'], folder_id)

        update_response = self.client.patch(
            reverse('chat-detail', kwargs={'pk': chat_id}),
            {'name': 'Обновлённый чат', 'folder': None},
            format='json',
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data['name'], 'Обновлённый чат')
        self.assertIsNone(update_response.data['folder'])

        delete_response = self.client.delete(reverse('chat-detail', kwargs={'pk': chat_id}))
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

        delete_folder_response = self.client.delete(reverse('folder-detail', kwargs={'pk': folder_id}))
        self.assertEqual(delete_folder_response.status_code, status.HTTP_204_NO_CONTENT)

    def test_logout_blacklists_refresh_token(self):
        tokens = self.authenticate()

        logout_response = self.client.post(
            reverse('logout'),
            {'refresh': tokens['refresh']},
            format='json',
        )
        self.assertEqual(logout_response.status_code, status.HTTP_205_RESET_CONTENT)

        refresh_response = self.client.post(
            reverse('token_refresh'),
            {'refresh': tokens['refresh']},
            format='json',
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch('users.views.complete_chat')
    def test_llm_chat_endpoint_returns_model_response(self, complete_chat_mock):
        complete_chat_mock.return_value = 'Локальная модель ответила.'

        response = self.client.post(
            reverse('llm-chat'),
            {
                'messages': [{'role': 'user', 'text': 'Привет'}],
                'model': 'nexus-3.8',
                'deep_mode': False,
                'request_id': 'req-123',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message']['text'], 'Локальная модель ответила.')
        complete_chat_mock.assert_called_once_with(
            [{'role': 'user', 'text': 'Привет'}],
            deep_mode=False,
            request_id='req-123',
        )

    @patch('users.views.cancel_chat')
    def test_llm_chat_stop_endpoint_cancels_active_request(self, cancel_chat_mock):
        cancel_chat_mock.return_value = True

        response = self.client.post(
            reverse('llm-chat-stop'),
            {'request_id': 'req-123'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['stopped'], True)
        cancel_chat_mock.assert_called_once_with('req-123')

    def test_llm_incomplete_detection_for_open_code_block(self):
        self.assertTrue(_looks_incomplete("```css\nbody {\n  color: red;\n", None))

    def test_llm_incomplete_detection_for_completed_answer(self):
        self.assertFalse(_looks_incomplete("```css\nbody {\n  color: red;\n}\n```", 'stop'))

    def test_llm_incomplete_detection_for_sentence_with_period(self):
        self.assertFalse(_looks_incomplete('Готовый ответ.', 'stop'))

    def test_collect_stream_response_accumulates_chunks(self):
        class FakeResponse:
            def __init__(self, lines):
                self._lines = iter(lines)

            def readline(self):
                return next(self._lines, b'')

        response = FakeResponse([
            b'data: {"choices":[{"index":0,"delta":{"content":"Priv"},"finish_reason":null}]}\n',
            b'\n',
            b'data: {"choices":[{"index":0,"delta":{"content":"et"},"finish_reason":null}]}\n',
            b'data: {"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n',
            b'data: [DONE]\n',
        ])

        text, finish_reason = _collect_stream_response(response)

        self.assertEqual(text, 'Privet')
        self.assertEqual(finish_reason, 'stop')

    def test_normalize_messages_merges_consecutive_roles(self):
        normalized = normalize_messages([
            {'role': 'assistant', 'text': 'Старый битый ответ'},
            {'role': 'user', 'text': 'Привет'},
            {'role': 'user', 'text': 'Сделай карточку'},
            {'role': 'assistant', 'text': 'Черновик'},
            {'role': 'assistant', 'text': 'Ещё кусок'},
        ])

        self.assertEqual(
            normalized,
            [
                {'role': 'user', 'content': 'Привет\n\nСделай карточку'},
                {'role': 'assistant', 'content': 'Черновик\n\nЕщё кусок'},
            ],
        )

    @patch('users.llm._request_completion')
    def test_complete_chat_trims_restarted_continuation(self, request_completion_mock):
        request_completion_mock.side_effect = [
            ('Вот пример простой HTML и CSS карточки', 'length'),
            ('Вот пример простой HTML и CSS карточки\n\nбез повторения хвост ответа', 'stop'),
        ]

        text = complete_chat([{'role': 'user', 'text': 'Сделай карточку'}])

        self.assertEqual(
            text,
            'Вот пример простой HTML и CSS карточки\nбез повторения хвост ответа',
        )
        self.assertEqual(request_completion_mock.call_count, 2)

    @patch('users.llm._request_completion')
    def test_complete_chat_trims_restarted_continuation_with_preamble(self, request_completion_mock):
        request_completion_mock.side_effect = [
            (
                'Конечно! Вот пример простой HTML и CSS портфолио карточки:\n\n'
                '**style.css**\n\n'
                '```css\n'
                '.card {\n'
                '    border-radius: 5px;\n'
                '    margin: 20px;\n'
                '}\n'
                '```\n\n'
                '**Пояснения:**\n'
                '* `border-radius`: Круглые',
                'length',
            ),
            (
                'Конечно, вот продолжение с места обрыва:\n\n'
                '**style.css**\n\n'
                '```css\n'
                '.card {\n'
                '    border-radius: 5px;\n'
                '    margin: 20px;\n'
                '}\n'
                '```\n\n'
                '**Пояснения:**\n'
                '* `border-radius`: Круглые углы.\n'
                '* `margin`: Отступы.',
                'stop',
            ),
        ]

        text = complete_chat([{'role': 'user', 'text': 'Сделай карточку'}])

        self.assertEqual(
            text,
            'Конечно! Вот пример простой HTML и CSS портфолио карточки:\n\n'
            '**style.css**\n\n'
            '```css\n'
            '.card {\n'
            '    border-radius: 5px;\n'
            '    margin: 20px;\n'
            '}\n'
            '```\n\n'
            '**Пояснения:**\n'
            '* `border-radius`: Круглые\n'
            'углы.\n'
            '* `margin`: Отступы.',
        )
        self.assertEqual(request_completion_mock.call_count, 2)
