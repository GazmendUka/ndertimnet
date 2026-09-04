from unittest.mock import patch

from django.test import override_settings
from rest_framework.test import APITestCase

from accounts.models import User

from .models import NotificationDevice, NotificationPreference
from .services import send_push_notification


class NotificationApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="push-user@example.com",
            password="test-pass",
            role="customer",
        )
        self.other_user = User.objects.create_user(
            email="other-push-user@example.com",
            password="test-pass",
            role="company",
        )
        self.client.force_authenticate(self.user)

    def test_device_registration_is_private_and_idempotent(self):
        token = "fcm-token-" + ("a" * 80)
        payload = {"token": token, "device_id": "device-1", "platform": "android"}

        first = self.client.post("/api/notifications/devices/register/", payload, format="json")
        second = self.client.post("/api/notifications/devices/register/", payload, format="json")

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertNotIn("token", first.data)
        self.assertEqual(NotificationDevice.objects.filter(token=token, active=True).count(), 1)

    def test_same_token_is_safely_reassigned_after_account_change(self):
        token = "fcm-token-" + ("b" * 80)
        NotificationDevice.objects.create(
            user=self.other_user,
            token=token,
            device_id="shared-device",
            platform="ios",
        )

        response = self.client.post(
            "/api/notifications/devices/register/",
            {"token": token, "device_id": "shared-device", "platform": "ios"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(NotificationDevice.objects.get(token=token).user, self.user)

    def test_disabling_push_deactivates_only_the_current_users_devices(self):
        own = NotificationDevice.objects.create(
            user=self.user,
            token="fcm-token-" + ("c" * 80),
            platform="android",
        )
        other = NotificationDevice.objects.create(
            user=self.other_user,
            token="fcm-token-" + ("d" * 80),
            platform="android",
        )

        response = self.client.patch(
            "/api/notifications/preferences/",
            {"push_enabled": False},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        own.refresh_from_db()
        other.refresh_from_db()
        self.assertFalse(own.active)
        self.assertTrue(other.active)

    def test_unregister_cannot_change_another_users_device(self):
        other = NotificationDevice.objects.create(
            user=self.other_user,
            token="fcm-token-" + ("e" * 80),
            device_id="other-device",
            platform="ios",
        )

        response = self.client.post(
            "/api/notifications/devices/unregister/",
            {"device_id": "other-device"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["unregistered"], 0)
        other.refresh_from_db()
        self.assertTrue(other.active)

    @override_settings(PUSH_NOTIFICATIONS_ENABLED=False, FIREBASE_PROJECT_ID="")
    @patch("firebase_admin.messaging.send_each")
    def test_delivery_is_a_noop_until_firebase_is_enabled(self, send_each):
        NotificationPreference.objects.create(user=self.user)
        NotificationDevice.objects.create(
            user=self.user,
            token="fcm-token-" + ("f" * 80),
            platform="android",
        )

        sent = send_push_notification(
            user=self.user,
            category="chat_messages",
            title="Test",
            body="Test body",
        )

        self.assertEqual(sent, 0)
        send_each.assert_not_called()
