"""Server-side prices for the replacement billing model, in EUR.

This module calculates prices only. It does not grant access, charge a card,
or decide when an offer becomes billable.
"""

from datetime import date
from zoneinfo import ZoneInfo
from django.utils import timezone
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP, ROUND_CEILING


CENT = Decimal("0.01")
OFFER_RATE = Decimal("0.01")
OFFER_MINIMUM = Decimal("2.95")
OFFER_MAXIMUM = Decimal("19.95")
DEFAULT_LISTING_PRICE = Decimal("3.95")


@dataclass(frozen=True)
class SubscriptionPlan:
    code: str
    monthly_price: Decimal
    offers_per_month: int
    regular_price: Decimal
    name: str

    def price_at(self, when=None):
        when = when or timezone.now()
        day = when.astimezone(ZoneInfo("Europe/Stockholm")).date() if hasattr(when, "astimezone") else when
        return self.monthly_price if day < date(2027, 1, 1) else self.regular_price


SUBSCRIPTION_PLANS = (
    SubscriptionPlan("standard", Decimal("29.00"), 10, Decimal("49.00"), "Standard"),
    SubscriptionPlan("pro", Decimal("59.00"), 30, Decimal("79.00"), "Pro"),
)


def money(value):
    """Validate a nonnegative, finite EUR amount without binary rounding."""
    try:
        amount = Decimal(str(value))
        if not amount.is_finite() or amount < 0:
            raise ValueError("Amount must be finite and nonnegative.")
        return amount.quantize(CENT, rounding=ROUND_HALF_UP)
    except (InvalidOperation, TypeError) as exc:
        raise ValueError("Invalid monetary amount.") from exc


def offer_fee(offer_total):
    amount = money(offer_total)
    percentage = amount * OFFER_RATE
    rounded = (percentage - Decimal("0.95")).to_integral_value(rounding=ROUND_CEILING) + Decimal("0.95")
    return min(OFFER_MAXIMUM, max(OFFER_MINIMUM, rounded))


def listing_price(*, regular_price=DEFAULT_LISTING_PRICE, introductory_free=True):
    regular = money(regular_price)
    payable = Decimal("0.00") if introductory_free else regular
    return {
        "regular_price": regular,
        "discount": regular - payable,
        "payable": payable,
        "currency": "EUR",
        "introductory_free": introductory_free,
    }


def get_subscription_plan(code):
    for plan in SUBSCRIPTION_PLANS:
        if plan.code == code:
            return plan
    raise ValueError("Unknown subscription plan.")
