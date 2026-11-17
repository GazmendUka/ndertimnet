"""Validate with the stores, never with prices or success flags sent by a device."""
from dataclasses import dataclass
from decimal import Decimal
import hashlib
import json
from pathlib import Path
import re
import time
from urllib.parse import quote

from django.conf import settings
import jwt
import requests


PRODUCTS = {
    "offers_3": "com.ndertimnet.app.offers3",
    "standard": "com.ndertimnet.app.standard.month",
    "pro": "com.ndertimnet.app.pro.month",
}
APP_ID = "com.ndertimnet.app"


class StoreError(Exception):
    """Only non-confidential messages may leave this boundary."""


class StorePending(StoreError):
    pass


class StoreRevoked(StoreError):
    pass


def environment(company_id):
    # Sandbox purchases may never give real businesses production credit.
    sandbox_ids = getattr(settings, "STORE_SANDBOX_COMPANY_IDS", [])
    return "Sandbox" if getattr(settings, "STORE_BILLING_ENVIRONMENT", "Production") == "Sandbox" or str(company_id) in sandbox_ids else "Production"


def enabled(platform):
    if not getattr(settings, "STORE_BILLING_ENABLED", False):
        return False
    if platform == "ios":
        return all(getattr(settings, key, "") for key in ("STORE_APPLE_KEY_ID", "STORE_APPLE_ISSUER_ID", "STORE_APPLE_PRIVATE_KEY"))
    return platform == "android" and bool(getattr(settings, "STORE_GOOGLE_CREDENTIALS_JSON", ""))


def products(platform):
    configured = getattr(settings, "STORE_PRODUCT_IDS", {}).get(platform, PRODUCTS)
    return {k: configured.get(k) for k in PRODUCTS if isinstance(configured.get(k), str) and configured[k]}


@dataclass(frozen=True)
class VerifiedPurchase:
    amount: Decimal
    currency: str
    environment: str
    consumed: bool = False


def transaction_hash(platform, reference):
    return hashlib.sha256((platform + ":" + reference).encode()).hexdigest()


def apple_transaction(checkout, reference):
    if not re.fullmatch(r"[0-9]{1,80}", reference):
        raise StoreError("Transaksioni nuk është i vlefshëm.")
    from appstoreserverlibrary.models.Environment import Environment
    from appstoreserverlibrary.signed_data_verifier import SignedDataVerifier
    env = Environment(checkout.environment)
    now = int(time.time())
    token = jwt.encode({"iss": settings.STORE_APPLE_ISSUER_ID, "iat": now - 5,
        "exp": now + 240, "aud": "appstoreconnect-v1", "bid": APP_ID},
        settings.STORE_APPLE_PRIVATE_KEY, algorithm="ES256", headers={"kid": settings.STORE_APPLE_KEY_ID})
    host = "api.storekit-sandbox.apple.com" if env == Environment.SANDBOX else "api.storekit.apple.com"
    response = requests.get(f"https://{host}/inApps/v1/transactions/{reference}",
        headers={"Authorization": "Bearer " + token}, timeout=20)
    if response.status_code != 200:
        raise StoreError("Verifikimi me Apple nuk është i disponueshëm. Provoni përsëri.")
    roots = [p.read_bytes() for p in (Path(__file__).parent / "apple_roots").glob("*.cer")]
    verifier = SignedDataVerifier(roots, True, env, APP_ID, 6825206974)
    data = verifier.verify_and_decode_signed_transaction(response.json()["signedTransactionInfo"])
    if (str(data.transactionId) != reference or data.productId != checkout.product_id
            or str(data.appAccountToken).lower() != str(checkout.pk) or data.quantity != 1):
        raise StoreError("Blerja nuk përputhet me kompaninë ose paketën.")
    if data.revocationDate is not None:
        raise StoreRevoked("Pagesa është rimbursuar ose anuluar.")
    expected_type = "Consumable" if checkout.product_id == products("ios").get("offers_3") else "Non-Renewing Subscription"
    if data.type is None or str(data.type.value) != expected_type:
        raise StoreError("Lloji i produktit nuk përputhet.")
    return VerifiedPurchase(Decimal(data.price) / 1000, data.currency, checkout.environment)


def google_session():
    from google.oauth2.service_account import Credentials
    from google.auth.transport.requests import AuthorizedSession
    credentials = Credentials.from_service_account_info(json.loads(settings.STORE_GOOGLE_CREDENTIALS_JSON),
        scopes=["https://www.googleapis.com/auth/androidpublisher"])
    return AuthorizedSession(credentials, refresh_timeout=20)


def google_url(checkout, reference):
    return (f"https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{APP_ID}"
        f"/purchases/products/{quote(checkout.product_id, safe='')}/tokens/{quote(reference, safe='')}")


def google_transaction(checkout, reference):
    with google_session() as session:
        response = session.get(google_url(checkout, reference), timeout=20)
        if response.status_code != 200:
            raise StoreError("Verifikimi me Google Play nuk është i disponueshëm. Provoni përsëri.")
        data = response.json()
        if data.get("obfuscatedExternalAccountId") != str(checkout.pk) or data.get("quantity", 1) != 1:
            raise StoreError("Blerja nuk përputhet me kompaninë ose sasinë.")
        if data.get("productId", checkout.product_id) != checkout.product_id:
            raise StoreError("Produkti nuk përputhet.")
        if (data.get("purchaseType") == 0) != (checkout.environment == "Sandbox"):
            raise StoreError("Pagesa testuese nuk mund të përdoret si pagesë reale.")
        if data.get("purchaseState") == 2:
            raise StorePending("Pagesa pret konfirmimin e Google Play.")
        if data.get("purchaseState") == 1 or data.get("refundableQuantity", 1) == 0:
            raise StoreRevoked("Pagesa është rimbursuar ose anuluar.")
        if data.get("purchaseState") != 0:
            raise StoreError("Pagesa nuk është konfirmuar.")
        order_id = data.get("orderId")
        if not isinstance(order_id, str) or not re.fullmatch(r"GPA\.[0-9.\-]+", order_id):
            raise StoreError("Mungon porosia e verifikuar.")
        order = session.get(f"https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{APP_ID}/orders/{quote(order_id, safe='')}", timeout=20)
        if order.status_code != 200:
            raise StoreError("Shuma e pagesës nuk mund të verifikohet ende.")
        order = order.json()
        if order.get("purchaseToken") != reference:
            raise StoreError("Porosia nuk përputhet me pagesën.")
        if order.get("state") in ("REFUNDED", "PARTIALLY_REFUNDED"):
            raise StoreRevoked("Pagesa është rimbursuar.")
        if order.get("state") != "PROCESSED":
            raise StoreError("Porosia nuk është përfunduar.")
        money = order["total"]
        amount = Decimal(money.get("units", "0")) + Decimal(money.get("nanos", 0)) / 1000000000
        return VerifiedPurchase(amount, money["currencyCode"], checkout.environment, data.get("consumptionState") == 1)


def verify(checkout, reference):
    if not enabled(checkout.platform):
        raise StoreError("Pagesat në dyqan nuk janë aktivizuar ende.")
    if not isinstance(reference, str) or not 1 <= len(reference) <= 4096:
        raise StoreError("Mungon referenca e blerjes.")
    try:
        return apple_transaction(checkout, reference) if checkout.platform == "ios" else google_transaction(checkout, reference)
    except StoreError:
        raise
    except Exception:
        # Do not leak JWTs, service-account keys, purchase tokens or raw provider errors.
        raise StoreError("Pagesa nuk mund të verifikohej. Provoni përsëri pa blerë sërish.") from None


def consume_google(checkout):
    try:
        with google_session() as session:
            result = session.post(google_url(checkout, checkout.verification_reference) + ":consume", timeout=20)
            if result.status_code not in (200, 204):
                # Another callback may already have consumed this exact purchase.
                check = session.get(google_url(checkout, checkout.verification_reference), timeout=20)
                data = check.json() if check.status_code == 200 else {}
                if not (data.get("purchaseState") == 0 and data.get("consumptionState") == 1 and data.get("obfuscatedExternalAccountId") == str(checkout.pk)):
                    raise StoreError("Konfirmimi i dorëzimit do të riprovohet.")
    except StoreError:
        raise
    except Exception:
        raise StoreError("Konfirmimi i dorëzimit do të riprovohet.") from None
