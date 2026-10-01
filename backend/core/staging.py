"""Staging-only guards; never enabled by production settings."""
from django.core.exceptions import PermissionDenied
from django.core.files.storage import Storage
from django.core.mail.backends.base import BaseEmailBackend


class NoIndexMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response["X-Robots-Tag"] = "noindex, nofollow, noarchive"
        return response


class BlockedMediaStorage(Storage):
    def _blocked(self, *args, **kwargs):
        raise PermissionDenied("Staging media is disabled until separate test storage is configured.")

    _open = _blocked
    _save = _blocked
    exists = _blocked
    delete = _blocked
    url = _blocked


class BlockedEmailBackend(BaseEmailBackend):
    def send_messages(self, email_messages):
        raise PermissionDenied("External messages are disabled in staging.")
