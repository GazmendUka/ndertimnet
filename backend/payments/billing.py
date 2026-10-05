"""Replacement platform billing. All quota writes lock the company first."""
import calendar
from decimal import Decimal

from django.conf import settings
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from accounts.models import Company
from .models import BillingSubscription, BillingPeriod, PlatformCharge, PaymentStatus
from .pricing import listing_price, get_subscription_plan


def add_months(value, months):
    month_index = value.year * 12 + value.month - 1 + months
    year, month_zero = divmod(month_index, 12)
    month = month_zero + 1
    return value.replace(year=year, month=month, day=min(value.day, calendar.monthrange(year, month)[1]))


def publication_price():
    return listing_price(regular_price=settings.LISTING_REGULAR_PRICE,
                         introductory_free=settings.LISTING_INTRODUCTORY_FREE)


def create_publication_charge(job):
    price = publication_price()
    charge, _ = PlatformCharge.objects.get_or_create(job_request=job, defaults={
        "payer": job.customer, "kind": PlatformCharge.Kind.LISTING,
        "regular_amount": price["regular_price"], "discount_amount": price["discount"],
        "amount": price["payable"],
        "status": PaymentStatus.PAID if price["payable"] == 0 else PaymentStatus.PENDING,
        "paid_at": timezone.now() if price["payable"] == 0 else None,
    })
    return charge


def current_subscription(company, now=None):
    now = now or timezone.now()
    return BillingSubscription.objects.filter(company=company).filter(
        Q(ends_at__isnull=True)
        | Q(ends_at__gt=now)
    ).order_by("-created_at").first()


def ensure_periods(subscription, now=None):
    """Materialise monthly amounts due up to cancellation, preserving historical charges.

    Payment is collected with hosted checkout; this is not automatic card debit.
    Period boundaries use the original billing-day anchor (Jan 31 -> Feb 28 -> Mar 31).
    """
    now = now or timezone.now()
    if not subscription.started_at:
        period, _ = BillingPeriod.objects.get_or_create(subscription=subscription, number=0)
        ensure_period_charge(period)
        return period
    number = 0
    latest = None
    while True:
        start = add_months(subscription.started_at, number)
        if start > now or (subscription.ends_at and start >= subscription.ends_at):
            break
        end = add_months(subscription.started_at, number + 1)
        if subscription.ends_at:
            end = min(end, subscription.ends_at)
        period, _ = BillingPeriod.objects.get_or_create(subscription=subscription, number=number,
                                                        defaults={"starts_at": start, "ends_at": end})
        if period.starts_at != start or period.ends_at != end:
            period.starts_at = start
            period.ends_at = end
            period.save(update_fields=["starts_at", "ends_at"])
        ensure_period_charge(period)
        latest = period
        number += 1
    return latest


def ensure_period_charge(period):
    sub = period.subscription
    if sub.pending_plan_code and period.starts_at and period.starts_at >= sub.pending_plan_at:
        plan = get_subscription_plan(sub.pending_plan_code)
        sub.plan_code = plan.code
        sub.monthly_offers = plan.offers_per_month
        sub.monthly_price = plan.price_at(period.starts_at)
        sub.pending_plan_code = ""
        sub.pending_plan_at = None
        sub.save(update_fields=["plan_code", "monthly_offers", "monthly_price", "pending_plan_code", "pending_plan_at"])
    if not period.plan_code:
        period.plan_code = sub.plan_code
        period.monthly_offers = sub.monthly_offers
        period.save(update_fields=["plan_code", "monthly_offers"])
    existing = PlatformCharge.objects.filter(period=period).first()
    if existing:
        return existing
    plan = get_subscription_plan(period.plan_code)
    amount = plan.price_at(period.starts_at)
    sub.monthly_price = amount
    sub.save(update_fields=["monthly_price"])
    return PlatformCharge.objects.get_or_create(period=period, defaults={
        "payer": sub.company.user, "company": sub.company,
        "kind": PlatformCharge.Kind.SUBSCRIPTION,
        "regular_amount": plan.regular_price, "discount_amount": plan.regular_price - amount, "amount": amount,
    })[0]


def available_period(company):
    now = timezone.now()
    sub = current_subscription(company, now)
    if not sub or not sub.started_at:
        return None
    period = ensure_periods(sub, now)
    if not period or not (period.starts_at <= now < period.ends_at):
        return None
    if sub.periods.filter(starts_at__lte=now).exclude(charge__status=PaymentStatus.PAID).exists():
        return None
    if period.charge.status == PaymentStatus.PAID and period.offers_used < period.monthly_offers:
        return period
    return None


def validate_offer_price(offer):
    version = offer.current_version
    if not version or version.price_amount is None or version.price_amount <= 0:
        raise ValidationError({"detail": "Vendosni çmimin e ofertës përpara dërgimit."})
    if version.currency.upper() != "EUR":
        raise ValidationError({"detail": "Ofertat duhet të jenë në EUR."})
    total = version.estimated_total
    if total is None or total <= 0 or total > Decimal("99999999.99"):
        raise ValidationError({"detail": "Vendosni orët e vlerësuara dhe një total të vlefshëm (maksimumi 99 999 999,99 €)."})
    return total


def offer_billing_state(offer):
    total = validate_offer_price(offer)
    charges = PlatformCharge.objects.filter(offer=offer)
    base = charges.filter(kind=PlatformCharge.Kind.OFFER, status=PaymentStatus.PAID).first()
    historical = offer.versions.filter(is_signed=True).exists()
    pending = charges.filter(checkouts__status=PaymentStatus.PENDING).exists()
    free_remaining = Company.objects.values_list("free_offers_remaining", flat=True).get(pk=offer.company_id)
    from .models import OfferCredit
    credits = OfferCredit.objects.filter(company=offer.company, redeemed_offer__isnull=True)
    credit = credits.exclude(source_offer__job_request_id=offer.job_request_id).exists()
    settled = bool(base)
    credit_available = credit and not settled and not historical and not pending
    introductory = not credit_available and free_remaining > 0 and not settled and not historical and not pending
    period = available_period(offer.company) if not settled and not historical and not introductory and not credit_available and not pending else None
    ready = settled or historical or introductory or credit_available or bool(period)
    return {"credit_available": credit_available, "credits_remaining": credits.count(),
            "billing_total": str(total), "fee": "0.00", "total_fee": "0.00",
            "already_paid": str(sum((c.amount for c in charges.filter(status=PaymentStatus.PAID)), Decimal("0.00"))),
            "adjustment": False, "currency": "EUR", "paid": settled,
            "included": bool(period), "legacy": historical, "introductory": introductory,
            "free_offers_remaining": free_remaining, "pending": pending,
            "remaining": period.monthly_offers - period.offers_used if period else 0,
            "subscription_required": not ready and not pending,
            "charge_id": base.pk if base else None}


def authorize_offer_send(offer, payer):
    """Called in the signing transaction. Consume a monthly entitlement once; never charge per offer."""
    company = Company.objects.select_for_update().get(pk=offer.company_id)
    total = validate_offer_price(offer)
    state = offer_billing_state(offer)
    charges = PlatformCharge.objects.filter(offer=offer)
    if state["pending"]:
        raise ValidationError({"detail": "Pagesa po verifikohet.", "code": "payment_pending"})
    if state["legacy"]:
        return
    if state["paid"]:
        for charge in charges.filter(status=PaymentStatus.PAID, fulfilled_at__isnull=True):
            charge.fulfilled_at = timezone.now()
            charge.save(update_fields=["fulfilled_at"])
        return
    from .models import OfferCredit
    credit = OfferCredit.objects.select_for_update().filter(company=company, redeemed_offer__isnull=True).exclude(source_offer__job_request_id=offer.job_request_id).order_by("created_at", "pk").first()
    introductory = not credit and company.free_offers_remaining > 0
    period = None if introductory or credit else available_period(company)
    if not credit and not introductory and not period:
        raise ValidationError({"detail": "Zgjidhni një abonim ose prisni rinovimin e kuotës përpara dërgimit.",
                               "code": "subscription_quota_required"})
    PlatformCharge.objects.update_or_create(offer=offer, kind=PlatformCharge.Kind.OFFER, defaults={
        "payer": payer, "company": offer.company,
        "regular_amount": Decimal("0.00"), "discount_amount": Decimal("0.00"),
        "amount": Decimal("0.00"), "quoted_price": total, "status": PaymentStatus.PAID,
        "included_in_period": period, "paid_at": timezone.now(), "fulfilled_at": timezone.now(),
    })
    if credit:
        credit.redeemed_offer = offer
        credit.redeemed_at = timezone.now()
        credit.save(update_fields=["redeemed_offer", "redeemed_at"])
    elif introductory:
        company.free_offers_remaining -= 1
        company.save(update_fields=["free_offers_remaining"])
    else:
        period.offers_used += 1
        period.save(update_fields=["offers_used"])


def settle_charge(charge):
    if charge.status == PaymentStatus.PAID:
        return
    charge.status = PaymentStatus.PAID
    charge.paid_at = timezone.now()
    charge.save(update_fields=["status", "paid_at"])
    if charge.kind == PlatformCharge.Kind.SUBSCRIPTION:
        sub = charge.period.subscription
        if not sub.started_at:
            sub.started_at = timezone.now()
            sub.save(update_fields=["started_at"])
            period = charge.period
            period.starts_at = sub.started_at
            period.ends_at = add_months(sub.started_at, 1)
            period.save(update_fields=["starts_at", "ends_at"])


def subscription_overview(company, subscription=None):
    """Server-derived dashboard values; callers hold the company lock."""
    from django.db.models import Sum
    from .models import OfferCredit
    now = timezone.now()
    sub = subscription
    active = bool(sub and (not sub.ends_at or sub.ends_at > now))
    period = ensure_periods(sub, now) if sub else None
    usable = available_period(company) if active else None
    debts = PlatformCharge.objects.filter(company=company, kind=PlatformCharge.Kind.SUBSCRIPTION,
        period__subscription__started_at__isnull=False,
        status__in=[PaymentStatus.PENDING, PaymentStatus.FAILED, PaymentStatus.CANCELED])
    next_debt = debts.select_related('period').order_by('period__starts_at', 'pk').first()
    due_at = amount = None
    if next_debt:
        due_at, amount = next_debt.period.starts_at, next_debt.amount
    elif active and sub.started_at and period and (not sub.ends_at or period.ends_at < sub.ends_at):
        due_at = period.ends_at
        amount = get_subscription_plan(sub.pending_plan_code or sub.plan_code).price_at(due_at)
    elif active and not sub.started_at:
        amount = get_subscription_plan(sub.plan_code).price_at()
    if not sub:
        state = 'none'
    elif not active:
        state = 'ended'
    elif not sub.started_at:
        state = 'awaiting_first_payment'
    elif debts.exists():
        state = 'payment_due'
    elif sub.canceled_at:
        state = 'ending'
    else:
        state = 'active'
    return {
        'state': state, 'collection': 'monthly_hosted_checkout',
        'free_offers_remaining': company.free_offers_remaining,
        'credits_remaining': OfferCredit.objects.filter(company=company, redeemed_offer__isnull=True).count(),
        'monthly_offers_remaining': max(0, usable.monthly_offers - usable.offers_used) if usable else 0,
        'monthly_offers_total': period.monthly_offers if active and period else 0,
        'period_ends_at': period.ends_at if active and period else None,
        'next_payment_due_at': due_at, 'next_payment_amount': str(amount) if amount is not None else None,
        'outstanding_amount': str(debts.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')),
        'ends_at': sub.ends_at if sub else None,
    }
