import json
from types import SimpleNamespace
from unittest.mock import patch

from django.test import override_settings
from rest_framework.test import APITestCase

from accounts.models import User

from .models import NotificationDevice, NotificationPreference
from .services import _firebase_app, send_push_notification


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


@override_settings(
    PUSH_NOTIFICATIONS_ENABLED=True,
    FIREBASE_PROJECT_ID="new-push-project",
    FIREBASE_LEGACY_PROJECT_ID="original-push-project",
    FIREBASE_CREDENTIALS_JSON=json.dumps({"type": "service_account", "project_id": "new-push-project"}),
)
class ProjectMigrationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="migration@example.com", password="test-pass", role="customer")
        self.client.force_authenticate(self.user)

    def register(self, **extra):
        return self.client.post("/api/notifications/devices/register/", {
            "token": "synthetic-registration-token-for-tests",
            "device_id": "test-device",
            "platform": "android",
            **extra,
        }, format="json")

    def device(self, label, project=""):
        return NotificationDevice.objects.create(
            user=self.user, token=f"synthetic-{label}-token-for-tests", platform="android", firebase_project_id=project,
        )

    def send(self):
        return send_push_notification(user=self.user, category="chat_messages", title="Test", body="Test body")

    def test_original_clients_can_still_register_without_project_metadata(self):
        self.assertEqual(self.register().status_code, 201)
        self.assertEqual(NotificationDevice.objects.get(user=self.user).firebase_project_id, "")

    def test_new_project_is_recorded_without_exposing_token_in_response(self):
        response = self.register(firebase_project_id="new-push-project")
        self.assertEqual(response.status_code, 201)
        self.assertNotIn("token", response.data)
        self.assertEqual(NotificationDevice.objects.get(user=self.user).firebase_project_id, "new-push-project")

    def test_unconfigured_project_is_rejected_without_changing_devices(self):
        self.assertEqual(self.register(firebase_project_id="untrusted-project").status_code, 400)
        self.assertFalse(NotificationDevice.objects.exists())

    def test_upgrade_replaces_previous_device_but_preserves_other_devices(self):
        previous = self.device("previous")
        previous.device_id = "test-device"
        previous.save(update_fields=["device_id"])
        other = self.device("other")
        self.assertEqual(self.register(firebase_project_id="new-push-project").status_code, 201)
        previous.refresh_from_db()
        other.refresh_from_db()
        self.assertFalse(previous.active)
        self.assertTrue(other.active)

    @patch("pushnotifications.services._firebase_app", side_effect=lambda project: project)
    @patch("firebase_admin.messaging.send_each")
    def test_old_and_new_devices_use_separate_matching_senders(self, send_each, app):
        self.device("old")
        self.device("new", "new-push-project")
        send_each.return_value = SimpleNamespace(responses=[SimpleNamespace(success=True)])
        self.assertEqual(self.send(), 2)
        deliveries = {call.kwargs["app"]: call.args[0] for call in send_each.call_args_list}
        self.assertEqual(set(deliveries), {"original-push-project", "new-push-project"})
        self.assertEqual(deliveries["original-push-project"][0].token, "synthetic-old-token-for-tests")
        self.assertEqual(deliveries["new-push-project"][0].token, "synthetic-new-token-for-tests")

    @patch("pushnotifications.services._firebase_app", side_effect=lambda project: project)
    @patch("firebase_admin.messaging.send_each")
    def test_one_project_outage_does_not_interrupt_the_other(self, send_each, app):
        old = self.device("old")
        self.device("new", "new-push-project")

        def delivery(messages, *, app):
            if app == "original-push-project":
                raise RuntimeError("synthetic provider failure")
            return SimpleNamespace(responses=[SimpleNamespace(success=True)])

        send_each.side_effect = delivery
        with self.assertLogs("pushnotifications.services", level="WARNING"):
            self.assertEqual(self.send(), 1)
        old.refresh_from_db()
        self.assertTrue(old.active)

    @patch("pushnotifications.services._firebase_app", return_value="sender")
    @patch("firebase_admin.messaging.send_each")
    def test_only_definitively_unregistered_tokens_are_deactivated(self, send_each, app):
        from firebase_admin import messaging
        gone = self.device("gone", "new-push-project")
        mismatch = self.device("mismatch")

        def delivery(messages, **kwargs):
            error = messaging.UnregisteredError("test") if messages[0].token == gone.token else messaging.SenderIdMismatchError("test")
            return SimpleNamespace(responses=[SimpleNamespace(success=False, exception=error)])

        send_each.side_effect = delivery
        self.assertEqual(self.send(), 0)
        gone.refresh_from_db()
        mismatch.refresh_from_db()
        self.assertFalse(gone.active)
        self.assertTrue(mismatch.active)

    @patch("pushnotifications.services._firebase_app")
    @patch("firebase_admin.messaging.send_each")
    def test_opt_out_prevents_delivery_for_both_projects(self, send_each, app):
        self.device("old")
        self.device("new", "new-push-project")
        NotificationPreference.objects.create(user=self.user, push_enabled=False)
        self.assertEqual(self.send(), 0)
        send_each.assert_not_called()
        app.assert_not_called()

    @patch("firebase_admin.get_app", side_effect=ValueError("not initialized"))
    @patch("firebase_admin.initialize_app")
    @patch("firebase_admin.credentials.Certificate")
    @patch("firebase_admin.credentials.ApplicationDefault")
    def test_new_sender_uses_new_certificate_and_original_sender_uses_existing_credentials(self, default, certificate, initialize, get_app):
        _firebase_app("new-push-project")
        certificate.assert_called_once_with({"type": "service_account", "project_id": "new-push-project"})
        self.assertEqual(initialize.call_args.args[0], certificate.return_value)
        self.assertEqual(initialize.call_args.kwargs["options"], {"projectId": "new-push-project"})
        self.assertIn("new-push-project", initialize.call_args.kwargs["name"])
        default.assert_not_called()
        _firebase_app("original-push-project")
        self.assertEqual(initialize.call_args.args[0], default.return_value)
        self.assertEqual(initialize.call_args.kwargs["options"], {"projectId": "original-push-project"})

    @override_settings(FIREBASE_CREDENTIALS_JSON="")
    @patch("firebase_admin.get_app", side_effect=ValueError("not initialized"))
    @patch("firebase_admin.initialize_app")
    @patch("firebase_admin.credentials.ApplicationDefault")
    def test_missing_new_credentials_never_fall_back_to_the_original_sender(self, default, initialize, get_app):
        from django.core.exceptions import ImproperlyConfigured
        with self.assertRaises(ImproperlyConfigured):
            _firebase_app("new-push-project")
        default.assert_not_called()
        initialize.assert_not_called()

    @override_settings(FIREBASE_CREDENTIALS_JSON='{"type":"service_account","project_id":"wrong-project"}')
    @patch("firebase_admin.get_app", side_effect=ValueError("not initialized"))
    @patch("firebase_admin.initialize_app")
    @patch("firebase_admin.credentials.Certificate")
    def test_credentials_from_another_project_are_rejected(self, certificate, initialize, get_app):
        from django.core.exceptions import ImproperlyConfigured
        with self.assertRaises(ImproperlyConfigured):
            _firebase_app("new-push-project")
        certificate.assert_not_called()
        initialize.assert_not_called()
