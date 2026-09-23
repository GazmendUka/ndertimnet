"""Shared verification for notifications and read-only gateway reconciliation.

No elapsed timeout or browser return can establish payment failure.
"""
from decimal import Decimal, InvalidOperation
from django.conf import settings
from django.db import transaction, IntegrityError
from django.utils import timezone
from accounts.models import Company
from .models import PlatformCheckout, PlatformCharge, PaymentStatus
from .billing import settle_charge
from .credits import compensate_closed_offer
from .services.raiaccept import (get_order_transactions, get_order_details, get_transaction_details,
    RaiAcceptError, PAID_STATUSES, FAILED_STATUSES, CANCELED_STATUSES)


class VerificationError(Exception):
    pass


def apply_verified_transaction(attempt_id, transaction_id, details, *, terminal_order=None):
    if not isinstance(details, dict):
        raise VerificationError("Invalid bank response")
    item = details.get("transaction") or details
    if not isinstance(item, dict):
        raise VerificationError("Invalid transaction")
    merchant = details.get("merchant") or {}
    if not isinstance(merchant, dict) or not settings.RAIACCEPT_MERCHANT_ACCOUNT_ID or merchant.get("merchantAccountId") != settings.RAIACCEPT_MERCHANT_ACCOUNT_ID:
        raise VerificationError("Merchant verification failed")
    if item.get("transactionId") != transaction_id or item.get("transactionType") != "PURCHASE":
        raise VerificationError("Transaction verification failed")
    if item.get("isProduction") is not (settings.RAIACCEPT_MODE == "production"):
        raise VerificationError("Environment verification failed")
    gateway_status = str(item.get("status", "")).upper()
    candidate = PlatformCheckout.objects.select_related("charge").get(pk=attempt_id)
    if gateway_status in FAILED_STATUSES | CANCELED_STATUSES and candidate.status != PaymentStatus.PAID:
        try:
            order = terminal_order if terminal_order is not None else get_order_details(candidate.order_id)
        except RaiAcceptError as exc:
            raise VerificationError("Order verification unavailable") from exc
        if not isinstance(order, dict) or order.get("orderIdentification") != candidate.order_id or str(order.get("status", "")).upper() not in FAILED_STATUSES | CANCELED_STATUSES:
            return "Pending"
    try:
        with transaction.atomic():
            if candidate.charge.company_id:
                Company.objects.select_for_update().get(pk=candidate.charge.company_id)
            charge = PlatformCharge.objects.select_for_update().get(pk=candidate.charge_id)
            attempt = PlatformCheckout.objects.select_for_update().get(pk=attempt_id)
            if PlatformCheckout.objects.filter(transaction_id=transaction_id).exclude(pk=attempt_id).exists():
                raise VerificationError("Duplicate transaction")
            if attempt.status == PaymentStatus.PAID:
                return "Already confirmed"
            if gateway_status in PAID_STATUSES:
                try:
                    amount = Decimal(str(item.get("transactionAmount")))
                except (InvalidOperation, ValueError):
                    raise VerificationError("Invalid amount")
                if not amount.is_finite() or amount != attempt.amount or amount != charge.amount or str(item.get("transactionCurrency", "")).upper() != charge.currency or str(item.get("statusCode")) != "0000":
                    raise VerificationError("Amount verification failed")
                attempt.status = PaymentStatus.PAID
                settle_charge(charge)
            elif gateway_status in FAILED_STATUSES | CANCELED_STATUSES:
                attempt.status = PaymentStatus.FAILED if gateway_status in FAILED_STATUSES else PaymentStatus.CANCELED
                if charge.status != PaymentStatus.PAID:
                    charge.status = attempt.status
                    charge.save(update_fields=["status"])
            else:
                return "Pending"
            attempt.transaction_id = transaction_id
            attempt.last_checked_at = timezone.now()
            attempt.reconciliation_note = "Verified by bank"
            attempt.save(update_fields=["transaction_id", "status", "last_checked_at", "reconciliation_note"])
    except IntegrityError as exc:
        raise VerificationError("Transaction already recorded; retry verification") from exc
    # The verification transaction ends before taking JobRequest/Offer locks.
    if charge.offer_id:
        compensate_closed_offer(charge.offer_id)
    return "Verified"


def reconcile_checkout(attempt_id):
    attempt = PlatformCheckout.objects.get(pk=attempt_id)
    if attempt.status != PaymentStatus.PENDING:
        return "Already resolved"
    note = "Awaiting bank result"
    try:
        if not attempt.order_id:
            note = "Manual review: bank order ID missing; do not release reservation"
            return note
        rows = get_order_transactions(attempt.order_id)
        purchases = [r for r in rows if r.get("transactionType") == "PURCHASE"]
        if not purchases:
            note = "Manual review: no purchase transaction; reservation retained"
            return note
        verified = []
        for row in purchases:
            tid = row.get("transactionId")
            if not isinstance(tid, str) or not tid:
                raise VerificationError("Missing transaction ID")
            details = get_transaction_details(attempt.order_id, tid)
            item = details.get("transaction") or details
            verified.append((tid, details, str(item.get("status", "")).upper()))
        successes = [v for v in verified if v[2] in PAID_STATUSES]
        if len(successes) > 1:
            note = "Manual review: multiple successful purchases"
            return note
        if successes:
            tid, details, _ = successes[0]
            note = apply_verified_transaction(attempt.pk, tid, details)
        elif all(v[2] in FAILED_STATUSES | CANCELED_STATUSES for v in verified):
            # A failed card attempt does not mean its checkout can no longer succeed.
            order = get_order_details(attempt.order_id)
            terminal = str(order.get("status", "")).upper() in FAILED_STATUSES | CANCELED_STATUSES
            matches = order.get("orderIdentification") == attempt.order_id
            if terminal and matches:
                tid, details, _ = verified[-1]
                note = apply_verified_transaction(attempt.pk, tid, details, terminal_order=order)
            else:
                note = "Awaiting terminal bank order; reservation retained"
    except (RaiAcceptError, VerificationError, TypeError, AttributeError):
        # Never store raw gateway errors, which may contain sensitive data.
        note = "Manual review: bank unavailable or verification failed"
    finally:
        PlatformCheckout.objects.filter(pk=attempt_id).update(last_checked_at=timezone.now(), reconciliation_note=note)
    return note
