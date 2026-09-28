"""Bound outbound contact mail independently of client-controlled IP headers."""
import math
import time

from django.db import transaction
from django.utils.crypto import salted_hmac

from .models import ContactSubmissionGuard

# Conservative launch limits. Global ceilings also cover rotating email addresses.
EMAIL_HOURLY_LIMIT = 5
GLOBAL_MINUTE_LIMIT = 5
GLOBAL_HOURLY_LIMIT = 20
GLOBAL_DAILY_LIMIT = 100


def reserve_contact_attempt(email):
    """Return retry seconds or None. Reserve before sending; failures consume quota.

    PostgreSQL row locking serializes workers, including concurrent row creation.
    The bounded history stores only timestamps and keyed email hashes. Expired
    records are removed on the next valid request; it never stores contact text.
    """
    identity = salted_hmac("contact-quota-v1", email.strip().casefold(), algorithm="sha256").hexdigest()
    with transaction.atomic():
        guard, _ = ContactSubmissionGuard.objects.select_for_update().get_or_create(pk=1)
        now = time.time()
        recent = [entry for entry in guard.attempts if entry["at"] > now - 86400]
        waits = []
        for period, limit, identity_filter in (
            (60, GLOBAL_MINUTE_LIMIT, None),
            (3600, GLOBAL_HOURLY_LIMIT, None),
            (86400, GLOBAL_DAILY_LIMIT, None),
            (3600, EMAIL_HOURLY_LIMIT, identity),
        ):
            matching = sorted(entry["at"] for entry in recent
                              if entry["at"] > now - period
                              and (identity_filter is None or entry["identity"] == identity_filter))
            if len(matching) >= limit:
                waits.append(math.ceil(matching[-limit] + period - now))
        if not waits:
            recent.append({"at": now, "identity": identity})
        if recent != guard.attempts:
            guard.attempts = recent
            guard.save(update_fields=["attempts"])
    return max(1, max(waits)) if waits else None
