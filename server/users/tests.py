from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


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
