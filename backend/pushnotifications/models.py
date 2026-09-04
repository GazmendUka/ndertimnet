from django.conf import settings
from django.db import models


class NotificationDevice(models.Model):
    class Platform(models.TextChoices):
        ANDROID = "android", "Android"
        IOS = "ios", "iOS"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_devices",
    )
    token = models.CharField(max_length=512, unique=True)
    device_id = models.CharField(max_length=64, blank=True, db_index=True)
    platform = models.CharField(max_length=10, choices=Platform.choices)
    active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-last_seen_at"]
        indexes = [models.Index(fields=["user", "active"])]

    def __str__(self):
        return f"{self.user_id} · {self.platform} · {'active' if self.active else 'inactive'}"


class NotificationPreference(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_preference",
    )
    push_enabled = models.BooleanField(default=True)
    chat_messages = models.BooleanField(default=True)
    offer_updates = models.BooleanField(default=True)
    payment_updates = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Notification preferences for user {self.user_id}"
