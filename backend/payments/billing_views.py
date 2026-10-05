from decimal import Decimal
import hashlib
from .agreements import VERSION as AGREEMENT_VERSION, agreement_text
from .models import SubscriptionAgreement

from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from accounts.models import Company
from jobrequests.models import JobRequest
from .offer_slots import require_offer_slot
from offers.models import Offer
from .models import BillingSubscription, PlatformCharge, PlatformCheckout, PaymentStatus
from .pricing import SUBSCRIPTION_PLANS, get_subscription_plan
from .billing import (publication_price, current_subscription, ensure_periods, add_months,
                      validate_offer_price, offer_billing_state, subscription_overview)
from .services.raiaccept import (create_checkout, get_transaction_details, RaiAcceptError,
                                build_platform_payload, _credentials)


def bank_payments_available():
    try:
        _credentials()
    except RaiAcceptError:
        return False
    return bool(settings.RAIACCEPT_MERCHANT_ACCOUNT_ID)


def bank_unavailable():
    return Response({"detail": "Pagesat bankare nuk janë aktivizuar ende.",
                     "code": "merchant_setup_required"}, status=503)


def charge_data(charge):
    return {"id": charge.pk, "kind": charge.kind, "type_display": charge.get_kind_display(),
            "amount": str(charge.amount), "regular_amount": str(charge.regular_amount),
            "discount_amount": str(charge.discount_amount), "currency": charge.currency,
            "status": charge.status, "created_at": charge.created_at, "paid_at": charge.paid_at,
            "offer_id": charge.offer_id, "job_request_id": charge.job_request_id,
            "subscription_id": charge.period.subscription_id if charge.period_id else None,
            "period_starts_at": charge.period.starts_at if charge.period_id else None,
            "period_ends_at": charge.period.ends_at if charge.period_id else None,
            "payable": charge.kind == PlatformCharge.Kind.SUBSCRIPTION and charge.status in (PaymentStatus.PENDING, PaymentStatus.FAILED, PaymentStatus.CANCELED) and not (charge.period.subscription.ends_at and not charge.period.subscription.started_at),
            "receipt_number": f"NDT-P-{charge.pk:08d}" if charge.status == PaymentStatus.PAID else None}


class BillingViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def company(self, request):
        company = getattr(request.user, "company_profile", None)
        if not company or request.user.role != "company":
            raise PermissionDenied("Vetëm kompanitë mund ta përdorin këtë funksion.")
        return company

    @action(detail=False, methods=["get"], permission_classes=[AllowAny])
    def catalog(self, request):
        price = {k: str(v) if isinstance(v, Decimal) else v for k, v in publication_price().items()}
        return Response({"listing": price, "offer": {"per_offer_payment": False},
                         "plans": [{"code": p.code, "name": p.name, "monthly_price": str(p.price_at()),
                                    "introductory_price": str(p.monthly_price), "regular_price": str(p.regular_price),
                                    "offers": p.offers_per_month} for p in SUBSCRIPTION_PLANS],
                         "introductory_until": "2026-12-31", "regular_from": "2027-01-01",
                         "pricing_timezone": "Europe/Stockholm",
                         "introductory_offers": 0, "notice_months": 0, "collection": "monthly_hosted_checkout",
                         "bank_payments_available": bank_payments_available()})

    @action(detail=False, methods=["get"])
    def credits(self, request):
        from .models import OfferCredit
        company = self.company(request)
        return Response([{"id": c.pk, "reason": c.get_reason_display(), "source_offer_id": c.source_offer_id,
                          "created_at": c.created_at, "redeemed_offer_id": c.redeemed_offer_id}
                         for c in OfferCredit.objects.filter(company=company).order_by("-created_at")])

    @action(detail=False, methods=["get"])
    def history(self, request):
        return Response([charge_data(c) for c in PlatformCharge.objects.filter(payer=request.user).select_related("period__subscription").order_by("-created_at")])

    @action(detail=False, methods=["get"], url_path="offer-quote")
    def offer_quote(self, request):
        company = self.company(request)
        offer = get_object_or_404(Offer.objects.select_related("current_version", "company"),
                                  pk=request.query_params.get("offer"), company=company)
        with transaction.atomic():
            Company.objects.select_for_update().get(pk=company.pk)
            return Response({**offer_billing_state(offer), "bank_payments_available": bank_payments_available()})

    @action(detail=False, methods=["post"], url_path="offer-checkout")
    def offer_checkout(self, request):
        company = self.company(request)
        with transaction.atomic():
            Company.objects.select_for_update().get(pk=company.pk)
            candidate = get_object_or_404(Offer, pk=request.data.get("offer"), company=company)
            JobRequest.objects.select_for_update().get(pk=candidate.job_request_id)
            offer = get_object_or_404(Offer.objects.select_for_update(of=("self",)).select_related("current_version", "job_request"),
                                      pk=request.data.get("offer"), company=company,
                                      job_request__is_deleted=False)
            if not offer.job_request.is_active and offer.status != "accepted":
                raise ValidationError({"detail": "Kërkesa nuk është më aktive."})
            if not company.can_unlock_leads():
                raise PermissionDenied("Plotësoni profilin e kompanisë.")
            state = offer_billing_state(offer)
            if state["paid"] or state["included"] or state["legacy"] or state["introductory"] or state["credit_available"]:
                return Response({"ready_to_sign": True, **state})
            return Response({"detail": "Zgjidhni abonimin ose prisni periudhën tjetër. Nuk ka pagesë për ofertë.",
                             "code": "subscription_quota_required", **state}, status=409)

    def require_web(self, request):
        platform = request.data.get("platform")
        if platform != "web":
            raise ValidationError({"detail": "Blerjet në aplikacion nuk janë aktivizuar ende.", "code": "store_billing_required"})

    @action(detail=False, methods=["post"], url_path="report-offer-price")
    def report_offer_price(self, request):
        return Response({"detail": "Ndryshoni ofertën dhe dërgojani klientit për miratim. Raportimi i veçuar i çmimit është mbyllur."}, status=410)

    @action(detail=False, methods=["get"])
    def subscription(self, request):
        company = self.company(request)
        with transaction.atomic():
            Company.objects.select_for_update().get(pk=company.pk)
            # Include ended contracts with outstanding bills in history.
            sub = BillingSubscription.objects.filter(company=company).order_by("-created_at").first()
            from .models import SubscriptionPlanChange
            plan_changes = [{"plan_code": c.plan_code, "text": c.text, "signer_name": c.signer_name, "signed_at": c.signed_at, "effective_at": c.effective_at, "sha256": c.sha256} for c in SubscriptionPlanChange.objects.filter(subscription__company=company).order_by("-signed_at")]
            agreements = [{"subscription_id": a.subscription_id, "text": a.text, "version": a.version,
                           "signer_name": a.signer_name, "signed_at": a.signed_at, "sha256": a.sha256}
                          for a in SubscriptionAgreement.objects.filter(subscription__company=company).order_by("-signed_at")]
            if not sub:
                return Response({"overview": subscription_overview(company), "subscription": None, "agreements": agreements, "plan_changes": plan_changes, "free_offers_remaining": company.free_offers_remaining})
            ensure_periods(sub)
            periods = [{"id": p.pk, "starts_at": p.starts_at, "ends_at": p.ends_at,
                        "offers_used": p.offers_used, "monthly_offers": p.monthly_offers, "plan_code": p.plan_code, "charge": charge_data(p.charge)} for p in sub.periods.order_by("number")]
            return Response({"overview": subscription_overview(company, sub), "agreements": agreements, "plan_changes": plan_changes, "free_offers_remaining": company.free_offers_remaining, "subscription": {"id": sub.pk, "plan_code": sub.plan_code,
                "monthly_price": str(get_subscription_plan(sub.plan_code).price_at()), "monthly_offers": sub.monthly_offers,
                "pending_plan_code": sub.pending_plan_code, "pending_plan_at": sub.pending_plan_at,
                "started_at": sub.started_at, "canceled_at": sub.canceled_at, "ends_at": sub.ends_at,
                "periods": periods}})

    @action(detail=False, methods=["get"], url_path="subscription-terms")
    def subscription_terms(self, request):
        company = self.company(request)
        try:
            plan = get_subscription_plan(request.query_params.get("plan"))
        except ValueError:
            raise ValidationError({"detail": "Zgjidhni planin."})
        return Response({"version": AGREEMENT_VERSION, "text": agreement_text(company, plan)})

    @action(detail=False, methods=["post"], url_path="subscribe")
    def subscribe(self, request):
        company = self.company(request)
        self.require_web(request)
        # Do not create signed contracts or unpaid bills while checkout is unavailable.
        if not bank_payments_available():
            return bank_unavailable()
        if request.data.get("accept_notice") is not True:
            raise ValidationError({"detail": "Pranoni marrëveshjen e abonimit mujor pa afat detyrues."})
        try:
            plan = get_subscription_plan(request.data.get("plan"))
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)})
        with transaction.atomic():
            Company.objects.select_for_update().get(pk=company.pk)
            sub = current_subscription(company)
            if sub and sub.plan_code != plan.code:
                raise ValidationError({"detail": "Keni tashmë një abonim. Ndryshimi i planit nuk është i disponueshëm."})
            if not sub:
                signer = str(request.data.get("signer_name") or "").strip()
                if not 2 <= len(signer) <= 200 or request.data.get("terms_version") != AGREEMENT_VERSION:
                    raise ValidationError({"detail": "Lexoni marrëveshjen aktuale dhe shkruani emrin e plotë për ta nënshkruar."})
                sub = BillingSubscription.objects.create(company=company, plan_code=plan.code,
                      monthly_price=plan.price_at(), monthly_offers=plan.offers_per_month, terms_version=AGREEMENT_VERSION)
                text = agreement_text(company, plan)
                SubscriptionAgreement.objects.create(subscription=sub, signed_by=request.user,
                    signer_name=signer, company_name=company.company_name, text=text,
                    version=AGREEMENT_VERSION, sha256=hashlib.sha256(text.encode()).hexdigest())
            period = ensure_periods(sub)
            charge = period.charge
        return self.checkout(request, charge)

    @action(detail=False, methods=["post"], url_path="cancel-subscription")
    def cancel_subscription(self, request):
        company = self.company(request)
        with transaction.atomic():
            Company.objects.select_for_update().get(pk=company.pk)
            sub = current_subscription(company)
            if not sub:
                raise ValidationError({"detail": "Nuk ka abonim aktiv për anulim."})
            if not sub.started_at:
                if PlatformCheckout.objects.filter(charge__period__subscription=sub, status=PaymentStatus.PENDING).exists():
                    raise ValidationError({"detail": "Prisni verifikimin e pagesës së parë përpara anulimit."})
                sub.canceled_at = sub.ends_at = timezone.now()
                sub.save(update_fields=["canceled_at", "ends_at"])
                return Response({"ends_at": sub.ends_at, "canceled_at": sub.canceled_at})
            if not sub.canceled_at:
                sub.canceled_at = timezone.now()
                period = ensure_periods(sub)
                sub.ends_at = period.ends_at
                sub.pending_plan_code = ""
                sub.pending_plan_at = None
                sub.save(update_fields=["canceled_at", "ends_at", "pending_plan_code", "pending_plan_at"])
            return Response({"ends_at": sub.ends_at, "canceled_at": sub.canceled_at})

    @action(detail=False, methods=["post"], url_path="change-plan")
    def change_plan(self, request):
        from .models import SubscriptionPlanChange
        company = self.company(request)
        try:
            plan = get_subscription_plan(request.data.get("plan"))
        except ValueError:
            raise ValidationError({"detail": "Zgjidhni planin."})
        signer = str(request.data.get("signer_name") or "").strip()
        if request.data.get("accept_notice") is not True or request.data.get("terms_version") != AGREEMENT_VERSION or not 2 <= len(signer) <= 200:
            raise ValidationError({"detail": "Lexoni dhe pranoni marrëveshjen aktuale."})
        with transaction.atomic():
            Company.objects.select_for_update().get(pk=company.pk)
            sub = current_subscription(company)
            if not sub or not sub.started_at or sub.canceled_at:
                raise ValidationError({"detail": "Ndryshimi kërkon një abonim të filluar që nuk është anuluar."})
            period = ensure_periods(sub)
            if PlatformCheckout.objects.filter(charge__period__subscription=sub, status=PaymentStatus.PENDING).exists():
                raise ValidationError({"detail": "Prisni verifikimin e pagesës përpara ndryshimit."})
            if sub.pending_plan_code == plan.code:
                return Response({"effective_at": sub.pending_plan_at, "plan_code": plan.code})
            text = agreement_text(company, plan)
            sub.pending_plan_code = plan.code if plan.code != sub.plan_code else ""
            sub.pending_plan_at = period.ends_at if sub.pending_plan_code else None
            sub.save(update_fields=["pending_plan_code", "pending_plan_at"])
            SubscriptionPlanChange.objects.create(subscription=sub, plan_code=plan.code,
                effective_at=period.ends_at, signer_name=signer, signed_by=request.user,
                text=text, version=AGREEMENT_VERSION, sha256=hashlib.sha256(text.encode()).hexdigest())
            return Response({"effective_at": sub.pending_plan_at, "plan_code": plan.code})

    @action(detail=True, methods=["post"], url_path="checkout")
    def charge_checkout(self, request, pk=None):
        charge = get_object_or_404(PlatformCharge, pk=pk, payer=request.user)
        self.require_web(request)
        return self.checkout(request, charge)

    def checkout(self, request, charge):
        self.require_web(request)
        if charge.kind in (PlatformCharge.Kind.OFFER, PlatformCharge.Kind.OFFER_ADJUSTMENT):
            return Response({"detail": "Pagesat për ofertë janë mbyllur. Zgjidhni një abonim.", "code": "individual_payments_retired"}, status=410)
        # Validate merchant configuration before creating a potentially uncertain attempt.
        if not bank_payments_available():
            return bank_unavailable()
        with transaction.atomic():
            if charge.company_id:
                Company.objects.select_for_update().get(pk=charge.company_id)
            if charge.offer_id:
                job_id = Offer.objects.values_list("job_request_id", flat=True).get(pk=charge.offer_id)
                job = JobRequest.objects.select_for_update().get(pk=job_id)
                offer = Offer.objects.select_for_update(of=("self",)).select_related("current_version", "job_request").get(pk=charge.offer_id)
                require_offer_slot(offer, job)
                if (not job.is_active and offer.status != "accepted") or job.is_deleted:
                    raise ValidationError({"detail": "Kërkesa nuk është më aktive."})
                if validate_offer_price(offer) != charge.quoted_price:
                    raise ValidationError({"detail": "Çmimi ka ndryshuar. Hapni përsëri ofertën."})
            charge = PlatformCharge.objects.select_for_update().get(pk=charge.pk)
            if charge.period_id and not charge.period.subscription.started_at and charge.period.subscription.ends_at:
                raise ValidationError({"detail": "Ky abonim u anulua para fillimit."})
            if charge.period_id and not charge.period.subscription.started_at and not charge.checkouts.exists():
                plan = get_subscription_plan(charge.period.subscription.plan_code)
                charge.amount = plan.price_at()
                charge.regular_amount = plan.regular_price
                charge.discount_amount = plan.regular_price - charge.amount
                charge.save(update_fields=["amount", "regular_amount", "discount_amount"])
            if charge.status == PaymentStatus.PAID:
                return Response(charge_data(charge))
            if charge.offer_id:
                state = offer_billing_state(offer)
                if state["paid"] or state["legacy"] or state["introductory"] or state["included"] or state["credit_available"]:
                    return Response({"ready_to_sign": True, **state})
            attempt = charge.checkouts.filter(status=PaymentStatus.PENDING).order_by("-pk").first()
            if attempt:
                if attempt.checkout_url:
                    return Response({"payment_url": attempt.checkout_url, "charge": charge_data(charge)}, status=202)
                # An uncertain gateway timeout must be reconciled, not blindly retried.
                return Response({"detail": "Pagesa po verifikohet. Kontaktoni mbështetjen nëse vonesa vazhdon.", "code": "payment_initializing"}, status=409)
            charge.status = PaymentStatus.PENDING
            charge.save(update_fields=["status"])
            attempt = PlatformCheckout.objects.create(charge=charge, amount=charge.amount)
        if charge.offer_id:
            path = f"/company/jobrequests/{charge.offer.job_request_id}/offer/edit?step=5&payment=return"
        elif charge.job_request_id:
            path = f"/customer/jobrequests/{charge.job_request_id}?payment=return"
        else:
            path = "/company/payments?payment=return"
        notify = (settings.BACKEND_BASE_URL + "/api/billing/notify/") if settings.BACKEND_BASE_URL else request.build_absolute_uri("/api/billing/notify/")
        payload = build_platform_payload(charge=charge, attempt=attempt, request=request,
                        return_url=settings.FRONTEND_BASE_URL + path, notification_url=notify)
        try:
            result = create_checkout(payload, on_order_created=lambda order_id: PlatformCheckout.objects.filter(pk=attempt.pk).update(order_id=order_id))
        except RaiAcceptError:
            # Keep pending: a timeout does not prove that the bank created no order.
            return Response({"detail": "Pagesa nuk mund të përgatitej. Kontaktoni mbështetjen.", "code": "checkout_unconfirmed"}, status=502)
        attempt.order_id = result["order_id"]
        attempt.checkout_url = result["payment_url"]
        attempt.save(update_fields=["order_id", "checkout_url"])
        return Response({"payment_url": attempt.checkout_url, "charge": charge_data(charge)}, status=202)

    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def notify(self, request):
        order_id = (request.data.get("order") or {}).get("orderIdentification")
        transaction_id = (request.data.get("transaction") or {}).get("transactionId")
        if not isinstance(order_id, str) or not isinstance(transaction_id, str):
            return Response({"detail": "Mungon porosia ose transaksioni."}, status=400)
        attempt = PlatformCheckout.objects.filter(order_id=order_id).select_related("charge").first()
        if not attempt:
            # No fallback from untrusted merchant references. Gateway can retry after order storage.
            return Response({"detail": "Porosia nuk u gjet."}, status=404)
        try:
            details = get_transaction_details(order_id, transaction_id)
        except RaiAcceptError:
            return Response({"detail": "Verifikimi nuk është i disponueshëm."}, status=502)
        from .reconciliation import apply_verified_transaction, VerificationError
        try:
            result = apply_verified_transaction(attempt.pk, transaction_id, details)
        except VerificationError as exc:
            return Response({"detail": str(exc)}, status=409)
        return Response({"detail": result})
