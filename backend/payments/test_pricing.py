from decimal import Decimal
from unittest import TestCase

from payments.pricing import get_subscription_plan, listing_price, offer_fee


class PricingTests(TestCase):
    def test_offer_fee_floor_percentage_and_cap(self):
        for total, expected in (
            ("0", "2.95"), ("100", "2.95"), ("294.99", "2.95"),
            ("295", "2.95"), ("500", "5.95"), ("1000", "10.95"),
            ("1950", "19.95"), ("395", "3.95"), ("395.01", "4.95"),
            ("1995", "19.95"), ("20000", "19.95"),
        ):
            with self.subTest(total=total):
                self.assertEqual(offer_fee(total), Decimal(expected))

    def test_rounding_half_cent_up(self):
        self.assertEqual(offer_fee("1000.50"), Decimal("10.95"))

    def test_invalid_offer_totals_rejected(self):
        for value in ("-1", "NaN", "Infinity", "bad", None):
            with self.subTest(value=value), self.assertRaises(ValueError):
                offer_fee(value)

    def test_introductory_discount_retains_price(self):
        price = listing_price()
        self.assertEqual(price["regular_price"], Decimal("3.95"))
        self.assertEqual(price["discount"], Decimal("3.95"))
        self.assertEqual(price["payable"], Decimal("0.00"))

    def test_listing_price_and_discount_can_be_changed(self):
        price = listing_price(regular_price="4.95", introductory_free=False)
        self.assertEqual(price["payable"], Decimal("4.95"))
        self.assertEqual(price["discount"], Decimal("0.00"))

    def test_subscription_catalog(self):
        for code, count, price in (("standard", 10, "29.00"), ("pro", 30, "59.00")):
            plan = get_subscription_plan(code)
            self.assertEqual(plan.monthly_price, Decimal(price))
            self.assertEqual(plan.offers_per_month, count)

    def test_unknown_plan_rejected(self):
        with self.assertRaises(ValueError):
            get_subscription_plan("offers_unlimited")
