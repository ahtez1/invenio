from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class RegisterLoginTests(APITestCase):
    def test_register_then_login(self):
        response = self.client.post(
            "/api/accounts/register/",
            {
                "email": "alice@example.com",
                "username": "alice",
                "password": "S0meStrongPass!",
                "first_name": "Alice",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertNotIn("password", response.data)

        response = self.client.post(
            "/api/accounts/login/",
            {"email": "alice@example.com", "password": "S0meStrongPass!"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_weak_password_rejected(self):
        response = self.client.post(
            "/api/accounts/register/",
            {"email": "bob@example.com", "username": "bob", "password": "12345678"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class MeViewTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="carol@example.com", username="carol", password="S0meStrongPass!"
        )

    def test_me_requires_auth(self):
        response = self.client.get("/api/accounts/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_returns_own_profile_only(self):
        self.client.force_authenticate(self.user)
        response = self.client.get("/api/accounts/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "carol@example.com")

    def test_change_password_requires_correct_current_password(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            "/api/accounts/change-password/",
            {"current_password": "wrong", "new_password": "AnotherStrongPass1"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
