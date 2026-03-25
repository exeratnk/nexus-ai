# Chatai

Локальный чат с mock-ботом, поддержкой нескольких чатов, переключаемыми моделями, «глубоким» режимом ответа, вложениями и авторизацией через Django + JWT. Тёмная тема по умолчанию, есть переключатель на светлую.

## Фичи
- Несколько чатов, переименование, удаление, якоря по пользовательским сообщениям.
- Выбор модели на чат (`GPT-4o`, `GPT-4o mini`, `GPT-3.5 Turbo`), быстрый или «Глубокое размышление» с более длинным ответом.
- Отправка сообщения без текста только с файлом; отображение вложений и их размера в истории.
- Модальное окно логина/регистрации (JWT), возможность работать гостем. Кнопка «Войти / Регистрация» в шапке.
- Сохранение токенов и чатов в `localStorage`.
- Переключатель тёмной/светлой темы в топбаре; дефолт — Discord-палитра.

## Быстрый старт
Требуется Node 18+ и Python 3.10+.

### 1) Backend (Django)
```bash
cd server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```
API: `http://localhost:8000/api/auth/` (register/login/refresh/logout/profile).

### 2) Frontend (Vite + React)
```bash
cd chatai
npm install
npm run dev
```
Откройте `http://localhost:5173`. Кнопка в шапке откроет модалку авторизации; без входа чат тоже работает (гость).

### 3) Продакшен-сборка
```bash
npm run build
npm run preview
```

## Структура
- `src/App.jsx` — основной лейаут, топбар, модалка auth.
- `src/hooks/useAuth.js` — логин/регистрация/логаут, токены в localStorage.
- `src/hooks/useChats.js` — состояние чатов, сообщения, модель, deepMode, вложения.
- `src/hooks/useTheme.js` — тёмная/светлая темы, хранение выбора.
- `src/components/ChatWindow.jsx` — окно диалога, выбор модели, deep toggle, файлы.
- `src/components/Sidebar.jsx`, `MessageList.jsx`, `AnchorBar.jsx`, `AuthScreen.jsx`.
- `server/` — Django-приложение (`users`, JWT, CORS).

## Полезное
- Бэкенд ожидает запущенный на `http://localhost:8000`; при недоступности фронт покажет понятное сообщение «Сервер недоступен…».
- Темы переключаются и запоминаются; чтобы сбросить — удалите ключ `chatai_theme` из localStorage.
- Данные чатов локальны (localStorage), сервер не хранит сами сообщения.
