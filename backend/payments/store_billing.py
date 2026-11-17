"""Store payments settle the same charges and quotas as website purchases."""
from decimal import Decimal, InvalidOperation
import hashlib
import re
from uuid import uuid4

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from accounts.models import Company
from . import store_gateway as gateway
from .billing import current_subscription, ensure_periods, settle_charge
from .models import BillingSubscription, OfferPackPurchase, PaymentStatus, PlatformCheckout, PlatformCharge, StoreCheckout, SubscriptionAgreement
from .offer_packs import PACK_PRICE, PACK_OFFERS
from .pricing import get_subscription_plan

TERMS_VERSION = "2026-11-05-store-manual-v1"


def selection(data):
    platform, code = data.get("platform"), data.get("code")
    if platform not in ("ios", "android") or not isinstance(code, str) or code not in gateway.products(platform):
        raise ValidationError({"detail": "Zgjidhni një produkt të disponueshëm."})
    if not gateway.enabled(platform):
        raise ValidationError({"detail": "Blerjet në dyqan nuk janë aktivizuar ende.", "code": "store_setup_required"})
    try:
        amount = Decimal(str(data.get("amount")))
        if not amount.is_finite() or not 0 < amount < Decimal("1000000000") or amount != amount.quantize(Decimal("0.001")):
            raise ValueError
    except (InvalidOperation, ValueError):
        raise ValidationError({"detail": "Rihapni çmimet në dyqan."}) from None
    currency = data.get("currency", "")
    if not isinstance(currency, str) or not re.fullmatch(r"[A-Z]{3}", currency):
        raise ValidationError({"detail": "Monedha e pagesës nuk është e vlefshme."})
    return platform, code, amount, currency


def terms(company, data):
    platform, code, amount, currency = selection(data)
    name = "Bazë" if code == "offers_3" else get_subscription_plan(code).name
    quota = PACK_OFFERS if code == "offers_3" else get_subscription_plan(code).offers_per_month
    store = "Apple App Store" if platform == "ios" else "Google Play"
    duration = "Ofertat nuk skadojnë. Nuk ka abonim." if code == "offers_3" else (
        "Kuota vlen për një periudhë mujore. Ofertat e papërdorura nuk barten. "
        "Pagesa e çdo muaji konfirmohet manualisht; ky nuk është produkt me debit automatik. "
        "Anulimi përfundon abonimin në fund të periudhës aktuale. "
        "Ndryshimi i planit vlen nga periudha tjetër. Periudhat e kaluara të papaguara mbeten të detyrueshme.")
    text = (f"NDËRTIMNET — {name}\nVersioni: {TERMS_VERSION}\nKompania: {company.company_name}\n"
        f"{quota} oferta; çmimi i kësaj pagese: {amount} {currency} përmes {store}.\n{duration}\n"
        "Pagesa përfundimtare konfirmohet në dyqan. Nuk aktivizohet pagesë automatike e kartës. "
        "Kuota aktivizohet vetëm pas verifikimit të pagesës nga serveri dhe është e përbashkët me faqen e internetit. "
        "Ofertat falas dhe kreditet ekzistuese ruhen. Një ofertë konsumohet pas nënshkrimit/dërgimit; "
        "rishikimet nuk konsumojnë kuotë shtesë. Kontaktet dhe biseda hapen pas dërgimit. "
        "Rimbursimet trajtohen nga dyqani; kuota e rimbursuar nuk mund të përdoret. "
        "Deklaroj se jam i autorizuar për kompaninë dhe pranoj këto kushte. Kopja ruhet në historik.")
    return {"text": text, "version": TERMS_VERSION, "amount": str(amount), "currency": currency}


def prepare(company, user, data):
    platform, code, amount, currency = selection(data)
    signer = str(data.get("signer_name") or "").strip()
    if data.get("accept_notice") is not True or data.get("terms_version") != TERMS_VERSION or not 2 <= len(signer) <= 200:
        raise ValidationError({"detail": "Lexoni dhe nënshkruani marrëveshjen aktuale."})
    text = terms(company, data)["text"]
    with transaction.atomic():
        Company.objects.select_for_update().get(pk=company.pk)
        charge_id = data.get("charge_id")
        if charge_id:
            if not isinstance(charge_id, (str, int)) or not str(charge_id).isdigit():
                raise ValidationError({"detail": "Referenca e pagesës nuk është e vlefshme."})
            charge = PlatformCharge.objects.filter(pk=charge_id, company=company, payer=user,
                status__in=[PaymentStatus.PENDING, PaymentStatus.CANCELED, PaymentStatus.FAILED]).first()
            if not charge:
                raise ValidationError({"detail": "Pagesa nuk është e disponueshme."})
            expected_code = "offers_3" if charge.kind == PlatformCharge.Kind.OFFER_PACK else charge.period.plan_code if charge.period_id else None
            if expected_code != code:
                raise ValidationError({"detail": "Produkti nuk përputhet me pagesën."})
        elif code == "offers_3":
            charge = PlatformCharge.objects.filter(company=company, kind=PlatformCharge.Kind.OFFER_PACK,
                status=PaymentStatus.PENDING).order_by("pk").first()
            if not charge:
                charge = PlatformCharge.objects.create(payer=user, company=company, kind=PlatformCharge.Kind.OFFER_PACK,
                    regular_amount=PACK_PRICE, amount=PACK_PRICE)
                OfferPackPurchase.objects.create(charge=charge, purchase_key=uuid4(), offers=PACK_OFFERS,
                    signer_name=signer, terms_version=TERMS_VERSION, terms_text=text)
        else:
            plan = get_subscription_plan(code)
            sub = current_subscription(company)
            if sub and sub.plan_code != code:
                raise ValidationError({"detail": "Ndryshoni planin për periudhën tjetër përpara pagesës."})
            if sub and sub.ends_at:
                raise ValidationError({"detail": "Prisni përfundimin e periudhës aktuale."})
            if not sub:
                sub = BillingSubscription.objects.create(company=company, plan_code=code,
                    monthly_price=plan.price_at(), monthly_offers=plan.offers_per_month, terms_version=TERMS_VERSION)
                SubscriptionAgreement.objects.create(subscription=sub, signed_by=user, signer_name=signer,
                    company_name=company.company_name, version=TERMS_VERSION, text=text,
                    sha256=hashlib.sha256(text.encode()).hexdigest())
            charge = ensure_periods(sub).charge
            if charge.status == PaymentStatus.PAID:
                raise ValidationError({"detail": "Periudha aktuale është paguar. Nuk duhet të blini përsëri."})
        if charge.period_id and charge.period.subscription.ends_at and not charge.period.subscription.started_at:
            raise ValidationError({"detail": "Ky abonim është anuluar përpara fillimit."})
        if PlatformCheckout.objects.filter(charge=charge, status=PaymentStatus.PENDING).exists():
            raise ValidationError({"detail": "Përfundoni ose anuloni pagesën bankare në pritje."})
        pending = charge.store_checkouts.filter(status=PaymentStatus.PENDING).first()
        if pending:
            if (pending.platform, pending.product_id, pending.quoted_amount, pending.currency) != (platform, gateway.products(platform)[code], amount, currency):
                raise ValidationError({"detail": "Përfundoni kontrollin e blerjes së mëparshme përpara një blerjeje të re."})
            return pending
        charge.status = PaymentStatus.PENDING
        charge.save(update_fields=["status"])
        return StoreCheckout.objects.create(charge=charge, platform=platform, product_id=gateway.products(platform)[code],
            quoted_amount=amount, currency=currency, environment=gateway.environment(company.pk),
            signer_name=signer, terms_text=text, terms_version=TERMS_VERSION)


def resolve(checkout, reference):
    """Network validation precedes locking; all grant/replay decisions are atomic."""
    if not isinstance(reference, str) or not 1 <= len(reference) <= 4096:
        raise gateway.StoreError("Mungon referenca e blerjes.")
    fingerprint = gateway.transaction_hash(checkout.platform, reference)
    if checkout.transaction_hash and checkout.transaction_hash != fingerprint:
        raise gateway.StoreError("Pagesa është lidhur me një transaksion tjetër.")
    revoked = False
    try:
        verified = gateway.verify(checkout, reference)
    except gateway.StorePending:
        # The gateway checks app/account ownership before classifying it as pending.
        with transaction.atomic():
            Company.objects.select_for_update().get(pk=checkout.charge.company_id)
            current = StoreCheckout.objects.select_for_update().get(pk=checkout.pk)
            if current.status == PaymentStatus.PENDING and not current.transaction_hash:
                current.transaction_hash = fingerprint
                current.verification_reference = reference
                current.save(update_fields=["transaction_hash", "verification_reference"])
        raise
    except gateway.StoreRevoked:
        revoked = True
        verified = None
    with transaction.atomic():
        Company.objects.select_for_update().get(pk=checkout.charge.company_id)
        checkout = StoreCheckout.objects.select_for_update().get(pk=checkout.pk)
        charge = PlatformCharge.objects.select_for_update().get(pk=checkout.charge_id)
        other = StoreCheckout.objects.filter(transaction_hash=fingerprint).exclude(pk=checkout.pk).exists()
        if other or (checkout.transaction_hash and checkout.transaction_hash != fingerprint):
            raise gateway.StoreError("Ky transaksion është përdorur më parë.")
        if checkout.status == PaymentStatus.REFUNDED:
            raise gateway.StoreRevoked("Pagesa është rimbursuar.")
        if revoked:
            checkout.transaction_hash = fingerprint
            checkout.verification_reference = reference
            if checkout.status == PaymentStatus.PAID:
                charge.status = checkout.status = PaymentStatus.REFUNDED
                charge.save(update_fields=["status"])
                if charge.period_id:
                    sub = charge.period.subscription
                    # A refund of an old month must not revoke a later paid month.
                    later_paid = sub.periods.filter(charge__status=PaymentStatus.PAID, ends_at__gt=timezone.now()).exists()
                    if not later_paid:
                        sub.canceled_at = sub.ends_at = timezone.now()
                        sub.save(update_fields=["canceled_at", "ends_at"])
            else:
                checkout.status = PaymentStatus.REFUNDED
                if charge.status != PaymentStatus.PAID:
                    charge.status = PaymentStatus.CANCELED
                    charge.save(update_fields=["status"])
                    if charge.period_id and not charge.period.subscription.started_at:
                        sub = charge.period.subscription
                        sub.canceled_at = sub.ends_at = timezone.now()
                        sub.save(update_fields=["canceled_at", "ends_at"])
            checkout.save(update_fields=["status", "transaction_hash", "verification_reference"])
        else:
            # Store-funded coupons may lower the final price, never exceed consent.
            if verified.environment != checkout.environment or not verified.amount.is_finite() or not 0 <= verified.amount <= checkout.quoted_amount or verified.currency != checkout.currency:
                raise gateway.StoreError("Shuma ose monedha nuk përputhet me marrëveshjen. Kontaktoni mbështetjen.")
            if verified.consumed and checkout.status != PaymentStatus.PAID:
                raise gateway.StoreError("Blerja është përdorur më parë.")
            if charge.status == PaymentStatus.PAID and checkout.status != PaymentStatus.PAID:
                raise gateway.StoreError("Kjo pagesë është përfunduar në një mënyrë tjetër. Mos blini sërish.")
            if charge.period_id and charge.period.subscription.ends_at and not charge.period.subscription.started_at:
                raise gateway.StoreError("Abonimi është anuluar. Kontaktoni mbështetjen për blerjen.")
            checkout.transaction_hash = fingerprint
            checkout.verification_reference = reference
            checkout.paid_amount = verified.amount
            checkout.status = PaymentStatus.PAID
            checkout.verified_at = checkout.verified_at or timezone.now()
            checkout.save(update_fields=["transaction_hash", "verification_reference", "paid_amount", "status", "verified_at"])
            settle_charge(charge)
            if checkout.platform == "android" and verified.consumed:
                checkout.finished_at = timezone.now()
                checkout.save(update_fields=["finished_at"])
        checkout.last_checked_at = timezone.now()
        checkout.save(update_fields=["last_checked_at"])
    if revoked:
        raise gateway.StoreRevoked("Pagesa është rimbursuar. Kuota është përditësuar.")
    if checkout.platform == "android" and not checkout.finished_at:
        gateway.consume_google(checkout)
        checkout.finished_at = timezone.now()
        checkout.save(update_fields=["finished_at"])
    return checkout
