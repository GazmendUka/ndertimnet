"""Shared enforcement for every direct-message entry point."""
from django.db.models import Q
from rest_framework.exceptions import PermissionDenied
from .models import User, UserBlock


def lock_chat_users(first_id, second_id):
    # Call inside atomic(), before locking an offer/lead. Block and send operations
    # use the same deterministic lock order, including different conversations.
    users = list(User.objects.select_for_update().filter(pk__in=[first_id, second_id]).order_by("pk"))
    if len(users) != 2 or not all(user.is_active for user in users):
        raise PermissionDenied("Biseda nuk është e disponueshme.")


def pair_blocks(first_id, second_id):
    return UserBlock.objects.filter(
        Q(blocker_id=first_id, blocked_user_id=second_id)
        | Q(blocker_id=second_id, blocked_user_id=first_id)
    )


def ensure_chat_not_blocked(first_id, second_id):
    if pair_blocks(first_id, second_id).exists():
        raise PermissionDenied({"detail": "Mesazhet janë ndaluar mes këtyre llogarive.", "code": "chat_blocked"})


def offer_chat_state(offer, user):
    from offers.models import OfferReview
    other_id = offer.job_request.customer_id if user.role == "company" else offer.company.user_id
    blocks = list(pair_blocks(user.pk, other_id).values_list("blocker_id", flat=True))
    available = offer.can_chat()
    return {"blocked": bool(blocks), "blocked_by_me": user.pk in blocks,
            "can_report": available, "can_send": available and not blocks and not OfferReview.objects.filter(offer=offer).exists()}
