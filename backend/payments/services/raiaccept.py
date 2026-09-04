import json
from decimal import Decimal
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from django.conf import settings


class RaiAcceptError(Exception):
    pass


AUTH_URL = "https://authenticate.raiaccept.com"
API_URL = "https://trapi.raiaccept.com"
AUTH_CLIENT_ID = "kr2gs4117arvbnaperqff5dml"
AUTH_FLOW = "USER_PASSWORD_AUTH"

PAID_STATUSES = {"PAID", "SUCCESS"}
FAILED_STATUSES = {"FAILED", "DECLINED", "ERROR"}
CANCELED_STATUSES = {"CANCELED", "CANCELLED", "ABANDONED"}


def _post_json(url, payload, headers=None, timeout=20):
    body = json.dumps(payload).encode("utf-8")
    request = Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            **(headers or {}),
        },
        method="POST",
    )
    return _send_json(request, timeout=timeout)


def _get_json(url, headers=None, timeout=20):
    request = Request(
        url,
        headers={
            "Accept": "application/json",
            **(headers or {}),
        },
        method="GET",
    )
    return _send_json(request, timeout=timeout)


def _send_json(request, timeout=20):
    try:
        with urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
    except HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")
        raise RaiAcceptError(f"RaiAccept HTTP {exc.code}: {details}") from exc
    except URLError as exc:
        raise RaiAcceptError(f"RaiAccept connection failed: {exc.reason}") from exc

    if not raw:
        return {}

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RaiAcceptError("RaiAccept returned invalid JSON") from exc


def _credentials():
    mode = settings.RAIACCEPT_MODE
    if mode == "production":
        username = settings.RAIACCEPT_PRODUCTION_USERNAME
        password = settings.RAIACCEPT_PRODUCTION_PASSWORD
    else:
        username = settings.RAIACCEPT_SANDBOX_USERNAME
        password = settings.RAIACCEPT_SANDBOX_PASSWORD

    if not username or not password:
        raise RaiAcceptError("RaiAccept API credentials are missing")

    return username, password


def retrieve_access_token():
    username, password = _credentials()
    response = _post_json(
        AUTH_URL,
        {
            "AuthFlow": AUTH_FLOW,
            "AuthParameters": {
                "USERNAME": username,
                "PASSWORD": password,
            },
            "ClientId": AUTH_CLIENT_ID,
        },
        headers={
            "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
        },
    )

    token = (
        response.get("AuthenticationResult", {})
        .get("IdToken")
    )

    if not token:
        raise RaiAcceptError("RaiAccept auth did not return an access token")

    return token


def create_checkout(payload):
    access_token = retrieve_access_token()
    order = _post_json(
        f"{API_URL}/orders",
        payload,
        headers={"Authorization": f"Bearer {access_token}"},
    )
    order_id = order.get("orderIdentification")

    if not order_id:
        raise RaiAcceptError("RaiAccept order response is missing orderIdentification")

    session = _post_json(
        f"{API_URL}/orders/{order_id}/checkout",
        payload,
        headers={"Authorization": f"Bearer {access_token}"},
    )
    redirect_url = session.get("paymentRedirectURL")

    if not redirect_url:
        raise RaiAcceptError("RaiAccept checkout response is missing paymentRedirectURL")

    parsed_redirect = urlparse(redirect_url)
    if parsed_redirect.scheme != "https" or not parsed_redirect.netloc:
        raise RaiAcceptError("RaiAccept checkout response contains an unsafe redirect URL")

    return {
        "order_id": order_id,
        "session_id": session.get("sessionId", ""),
        "payment_url": redirect_url,
    }


def get_transaction_details(order_id, transaction_id):
    access_token = retrieve_access_token()
    return _get_json(
        f"{API_URL}/orders/{order_id}/transactions/{transaction_id}",
        headers={"Authorization": f"Bearer {access_token}"},
    )


def as_raiaccept_amount(amount: Decimal) -> float:
    return float(amount.quantize(Decimal("0.01")))


def country_to_iso3(country_code):
    return {
        "AL": "ALB",
        "XK": "XKX",
    }.get((country_code or "").upper(), settings.RAIACCEPT_DEFAULT_COUNTRY)


def build_lead_unlock_payload(*, payment, job, request, return_url, notification_url):
    user = request.user
    company = payment.company
    city = getattr(company, "city", None) or getattr(job, "city", None)
    country = country_to_iso3(getattr(city, "country", "XK"))

    first_name = (getattr(user, "first_name", "") or "Ndertimnet")[:32]
    last_name = (getattr(user, "last_name", "") or "Company")[:32]
    email = getattr(user, "email", "") or "payments@ndertimnet.com"
    phone = getattr(company, "phone", "") or ""
    city_name = getattr(city, "name", "") or "Prishtina"
    address = getattr(company, "address", "") or city_name

    consumer = {
        "firstName": first_name,
        "lastName": last_name,
        "email": email,
        "phone": phone,
        "mobilePhone": "",
        "workPhone": "",
        "ipAddress": _client_ip(request),
    }
    billing_address = {
        "firstName": first_name,
        "lastName": last_name,
        "addressStreet1": address[:50],
        "addressStreet2": "",
        "addressStreet3": "",
        "city": city_name[:50],
        "postalCode": "",
        "country": country,
        "state": "",
    }
    invoice_item = {
        "description": f"Ndertimnet lead #{job.id}",
        "numberOfItems": 1,
        "price": as_raiaccept_amount(payment.amount),
    }

    return {
        "billingAddress": billing_address,
        "shippingAddress": billing_address,
        "consumer": consumer,
        "invoice": {
            "amount": as_raiaccept_amount(payment.amount),
            "currency": payment.currency,
            "description": f"Lead unlock for job #{job.id}",
            "items": [invoice_item],
            "merchantOrderReference": f"payment_{payment.id}",
        },
        "urls": {
            "cancelUrl": return_url,
            "failUrl": return_url,
            "successUrl": return_url,
            "notificationUrl": notification_url,
        },
        "paymentMethodPreference": "CARD",
        "recurring": None,
    }


def build_job_payment_payload(*, payment, offer, request, return_url, notification_url):
    user = request.user
    customer = getattr(user, "customer_profile", None)
    job = offer.job_request
    city = getattr(customer, "city", None) or getattr(job, "city", None)
    country_code = getattr(customer, "country", None) or getattr(city, "country", "XK")
    country = country_to_iso3(country_code)

    first_name = (getattr(user, "first_name", "") or "Ndertimnet")[:32]
    last_name = (getattr(user, "last_name", "") or "Customer")[:32]
    email = getattr(user, "email", "") or "payments@ndertimnet.com"
    phone = (getattr(customer, "phone", "") or "")[:30]
    city_name = (getattr(city, "name", "") or "Prishtina")[:50]
    address = (getattr(customer, "address", "") or city_name)[:50]

    consumer = {
        "firstName": first_name,
        "lastName": last_name,
        "email": email,
        "phone": phone,
        "mobilePhone": "",
        "workPhone": "",
        "ipAddress": _client_ip(request),
    }
    billing_address = {
        "firstName": first_name,
        "lastName": last_name,
        "addressStreet1": address,
        "addressStreet2": "",
        "addressStreet3": "",
        "city": city_name,
        "postalCode": (getattr(customer, "postal_code", "") or "")[:20],
        "country": country,
        "state": "",
    }
    item_description = f"{job.title[:80]} (offer #{offer.id})"

    return {
        "billingAddress": billing_address,
        "shippingAddress": billing_address,
        "consumer": consumer,
        "invoice": {
            "amount": as_raiaccept_amount(payment.amount),
            "currency": payment.currency,
            "description": item_description,
            "items": [{
                "description": item_description,
                "numberOfItems": 1,
                "price": as_raiaccept_amount(payment.amount),
            }],
            "merchantOrderReference": f"payment_{payment.id}",
        },
        "urls": {
            "cancelUrl": return_url,
            "failUrl": return_url,
            "successUrl": return_url,
            "notificationUrl": notification_url,
        },
        "paymentMethodPreference": "CARD",
        "recurring": None,
    }


def _client_ip(request):
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")
