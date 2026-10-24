from django.db import transaction
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from accounts.models import UserBlock
from accounts.chat_safety import lock_chat_users, offer_chat_state
from .models import ChatReport, OfferMessage


class ChatReportThrottle(UserRateThrottle):
    scope = "chat_report"
    rate = "20/day"


class ReportInput(serializers.Serializer):
    message_id = serializers.IntegerField(required=False, min_value=1)
    reason = serializers.ChoiceField(choices=ChatReport.Reason.choices)
    details = serializers.CharField(required=False, allow_blank=True, max_length=1000)
    block_user = serializers.BooleanField(default=False)

    def validate(self, data):
        if data["reason"] == ChatReport.Reason.OTHER and len(data.get("details", "").strip()) < 10:
            raise serializers.ValidationError({"details": "Përshkruani shqetësimin me të paktën 10 karaktere."})
        return data


class BlockInput(serializers.Serializer):
    blocked = serializers.BooleanField()


class OfferChatSafetyMixin:
    def safety_offer(self):
        offer = self.get_object()
        if not offer.can_chat():
            raise PermissionDenied("Biseda hapet pas dërgimit të ofertës.")
        return offer

    @action(detail=True, methods=["get"], url_path="chat-safety")
    def chat_safety(self, request, pk=None):
        return Response(offer_chat_state(self.get_object(), request.user))

    @action(detail=True, methods=["post"], url_path="chat-block")
    def chat_block(self, request, pk=None):
        offer = self.safety_offer()
        data = BlockInput(data=request.data)
        data.is_valid(raise_exception=True)
        other_id = offer.job_request.customer_id if request.user.role == "company" else offer.company.user_id
        with transaction.atomic():
            lock_chat_users(request.user.pk, other_id)
            if data.validated_data["blocked"]:
                UserBlock.objects.get_or_create(blocker=request.user, blocked_user_id=other_id)
            else:
                # A participant can only remove their own block, never the other person's.
                UserBlock.objects.filter(blocker=request.user, blocked_user_id=other_id).delete()
            result = offer_chat_state(offer, request.user)
        return Response(result)

    @action(detail=True, methods=["post"], url_path="chat-reports", throttle_classes=[ChatReportThrottle])
    def chat_reports(self, request, pk=None):
        offer = self.safety_offer()
        data = ReportInput(data=request.data)
        data.is_valid(raise_exception=True)
        fields = data.validated_data
        other_id = offer.job_request.customer_id if request.user.role == "company" else offer.company.user_id
        with transaction.atomic():
            lock_chat_users(request.user.pk, other_id)
            # The same offer lock is used by message retention cleanup.
            type(offer).objects.select_for_update().get(pk=offer.pk)
            message = None
            if fields.get("message_id"):
                message = OfferMessage.objects.filter(pk=fields["message_id"], offer=offer).first()
                if not message or message.sender_type == request.user.role:
                    raise serializers.ValidationError({"message_id": "Zgjidhni një mesazh të palës tjetër në këtë bisedë."})
            report, created = ChatReport.objects.get_or_create(
                reporter=request.user, offer=offer, message=message, status=ChatReport.Status.PENDING,
                defaults={"reported_user_id": other_id, "reason": fields["reason"], "details": fields.get("details", "")},
            )
            if fields["block_user"]:
                UserBlock.objects.get_or_create(blocker=request.user, blocked_user_id=other_id)
            state = offer_chat_state(offer, request.user)
        return Response({"id": report.pk, "status": report.status, "already_reported": not created, "chat_state": state}, status=201 if created else 200)
