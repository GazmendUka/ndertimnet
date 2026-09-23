"""Deterministic contact filter, not an identity or intent classifier."""
import re
import unicodedata
from rest_framework.exceptions import ValidationError

NOTICE = "Numrat e telefonit dhe email-et mund të ndahen pasi oferta të dërgohet dhe tarifa të jetë paguar ose e përfshirë."
EMAIL = re.compile(r"[\w.+-]+\s*@\s*[\w-]+(?:\s*\.\s*[\w-]+)+", re.I)
PHONE = re.compile(r"(?<!\w)(?:\+|00)?\d(?:[\s()./\-]*\d){6,14}(?!\w)")
LINK = re.compile(r"(?:mailto:|tel:|(?:https?://)?(?:wa\.me|api\.whatsapp\.com|t\.me)/)\S*", re.I)
WORDS = re.compile(r"\b(?:zero|one|two|three|four|five|six|seven|eight|nine|nje|një|dy|tre|kater|katër|pese|pesë|gjashte|gjashtë|shtate|shtatë|tete|tetë|nente|nëntë|noll|ett|två|fyra|fem|sju|åtta|nio)\b", re.I)

def normalized(text):
    value = ''.join(c for c in unicodedata.normalize('NFKC', text or '') if unicodedata.category(c) != 'Cf')
    value = re.sub(r"\s*(?:\[at\]|\(at\)|\bat\b|\bsnabel-?a\b)\s*", '@', value, flags=re.I)
    value = re.sub(r"\s*(?:\[dot\]|\(dot\)|\bdot\b|\bpikë\b)\s*", '.', value, flags=re.I)
    return value

def contains_contact(text):
    value = normalized(text)
    if EMAIL.search(value) or LINK.search(value):
        return True
    for match in PHONE.finditer(value):
        token = match.group()
        # Dates and currency amounts must remain usable in job discussions.
        if re.fullmatch(r"\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4}", token):
            continue
        following = value[match.end():match.end()+8].strip().upper()
        preceding = value[max(0,match.start()-5):match.start()].strip().upper()
        if (following.startswith(('€','EUR','LEK')) or preceding.endswith(('€','EUR'))) and not token.startswith(('+','00')):
            continue
        return True
    # Common spelling-out of phone digits; ordinary counts or prices aren't blocked.
    count = 0
    last_end = 0
    for match in WORDS.finditer(value):
        if count and value[last_end:match.start()].strip(' ,.;-/'):
            count = 0
        count += 1
        last_end = match.end()
        if count >= 7:
            return True
    return False

def enforce_contact_policy(offer, text):
    if not offer.can_view_lead_details() and contains_contact(text):
        raise ValidationError({"detail": NOTICE, "code": "contact_before_acceptance"})

def safe_text(text):
    # Hide existing contact-containing text rather than rewriting a phone or email incorrectly.
    return "[Kontaktet fshihen deri në pranimin e ofertës.]" if contains_contact(text) else text

def company_contacts_allowed(company, context):
    request = context.get('request')
    user = getattr(request, 'user', None)
    if not user or not user.is_authenticated:
        return False
    if user.pk == company.user_id or user.is_staff:
        return True
    from .models import Offer, OfferStatus
    return Offer.objects.filter(company=company, job_request__customer=user, versions__is_signed=True).exists()

def redact_company(data):
    for field in ('phone','website','address','account_email','registration_document'):
        if field in data:
            data[field] = None
    if isinstance(data.get('user'), dict):
        data['user'] = {'first_name': data['user'].get('first_name', ''), 'last_name': data['user'].get('last_name', '')}
    for field in ('company_name','description','default_offer_presentation'):
        if isinstance(data.get(field), str):
            data[field] = safe_text(data[field])
    return data
