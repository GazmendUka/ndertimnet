# backend/accounts/views.py

from datetime import timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Customer, Company

from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

from rest_framework import viewsets, status, generics
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import TokenError

from .utils.email_verification import (
    verify_email_token,
    generate_email_verification_token,
)
from .emails import (
    send_verification_email,
    send_password_reset_email,
)

User = get_user_model()

from .serializers import (
    UserSerializer,
    CustomerSerializer,
    CompanySerializer,
    RegisterCompanySerializer,
    RegisterCustomerSerializer,
    CustomerProfileSerializer,
    CustomerConsentSerializer,
)

# ======================================================
# 🧩 HELPER FUNCTIONS
# ======================================================

def success(message="", data=None):
    return Response({
        "success": True,
        "message": message,
        "data": data
    }, status=200)

def error(message, code=400):
    return Response({
        "success": False,
        "message": message
    }, status=code)



# ======================================================
# 🇦🇱 MODEL VIEWSETS
# ======================================================

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all() 
    serializer_class = UserSerializer
    pagination_class = None

    def get_queryset(self):
        user = self.request.user

        if user.is_staff or user.role == "admin":
            return User.objects.all()

        return User.objects.filter(is_active=True)



class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all() 
    serializer_class = CustomerSerializer
    pagination_class = None

    def get_queryset(self):
        user = self.request.user

        if user.is_staff or user.role == "admin":
            return Customer.objects.all()

        return Customer.objects.filter(user__is_active=True)

# ======================================================
# 🔑 LOGIN
# ======================================================

# ======================================================
# 🔑 LOGIN (robust email + password)
# ======================================================

class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []  # 🔥 GARANTERAT ingen JWT här

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        if not email or not password:
            return error("Ju lutem plotësoni email dhe fjalëkalim.", 400)

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return error("Email ose fjalëkalim i pasaktë.", 401)

        if not user.check_password(password):
            return error("Email ose fjalëkalim i pasaktë.", 401)

        if not user.is_active:
            return error("Ky përdorues është i çaktivizuar.", 403)
        

        remember_me = request.data.get("remember_me", False)
        refresh = RefreshToken.for_user(user)
        if remember_me:
            refresh.set_exp(lifetime=timedelta(days=30))

        return success(
            message="Hyrja u krye me sukses.",
            data={
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            }
        )
  

class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("token")
        if not token:
            return Response({"detail": "Token mungon"}, status=status.HTTP_400_BAD_REQUEST)

        user_id = verify_email_token(token)
        if not user_id:
            return Response(
                {"detail": "Linku është i pavlefshëm ose ka skaduar"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"detail": "Përdoruesi nuk u gjet"}, status=status.HTTP_404_NOT_FOUND)

        # ✅ Bestäm reactivation mer robust:
        # - user var inaktiv, eller
        # - company var inaktiv / arkiverad
        reactivated = (not user.is_active)

        try:
            company = user.company_profile
        except Company.DoesNotExist:
            company = None

        if company and ((not company.is_active) or (company.archived_at is not None)):
            reactivated = True

        # 🔄 Reactivate if needed
        if reactivated:
            user.is_active = True
            if company:
                company.is_active = True
                company.archived_at = None
                company.save(update_fields=["is_active", "archived_at"])

        # ✅ Mark email verified (always)
        user.email_verified = True
        user.email_verified_at = timezone.now()
        user.save(update_fields=["email_verified", "email_verified_at", "is_active"])

        if reactivated:
            return Response(
                {
                    "detail": "Llogaria juaj u riaktivizua me sukses. Mirë se u kthyet në Ndërtimnet!",
                    "reactivated": True,
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {"detail": "Email-i u verifikua me sukses", "reactivated": False},
            status=status.HTTP_200_OK,
        )



class ResendVerificationEmailView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        user = request.user

        if user.email_verified:
            return Response(
                {"detail": "Email-i është verifikuar tashmë"},
                status=status.HTTP_200_OK,
            )

        token = generate_email_verification_token(user)
        send_verification_email(user, token)

        return Response(
            {
                "detail": (
                    "Email-i i verifikimit u dërgua. "
                    "Ju lutem kontrolloni inbox-in tuaj."
                )
            },
            status=status.HTTP_200_OK,
        )



# ======================================================
# 👤 CURRENT USER
# ======================================================

@api_view(["GET"])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def current_user(request):
    user = request.user

    profile_step = 0
    profile_completed = False

    # Company
    if hasattr(user, "company_profile"):
        company = user.company_profile
        profile_step = getattr(company, "profile_step", 0)
        profile_completed = profile_step == 4

    # Customer
    if hasattr(user, "customer_profile"):
        customer = user.customer_profile
        profile_step = getattr(customer, "profile_step", 0)
        profile_completed = profile_step == 4

    response = {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email_verified": user.email_verified,
        "profile_step": profile_step,
        "profile_completed": profile_completed,
    }

    if hasattr(user, "company_profile"):
        response["company"] = CompanySerializer(
            user.company_profile,
            context={"request": request}
        ).data

    if hasattr(user, "customer_profile"):
        response["customer"] = {
            "id": user.customer_profile.id,
            "phone": user.customer_profile.phone,
            "address": user.customer_profile.address,
        }

    return success(data=response)



# ======================================================
# 🏢 REGISTER COMPANY
# ======================================================

class RegisterCompanyView(generics.CreateAPIView):
    serializer_class = RegisterCompanySerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):   
        serializer = self.get_serializer(
            data=request.data,
            context={"request": request}   # 🔥 VIKTIGAST
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # ✅ EMAIL VERIFICATION
        token = generate_email_verification_token(user)
        send_verification_email(user, token)

        return success(
            message="Kompania u regjistrua me sukses. Ju lutem verifikoni email-in tuaj.",
            data={
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "role": user.role,
                    "company": getattr(user.company_profile, "id", None),
                }
            }
        )



# ======================================================
# 👤 REGISTER CUSTOMER (SMART REACTIVATION)
# ======================================================

class RegisterCustomerView(generics.CreateAPIView):
    serializer_class = RegisterCustomerSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        email = request.data.get("email")

        if not email:
            return error("Email mungon.", 400)

        # --------------------------------------------------
        # 🔎 Check if user already exists
        # --------------------------------------------------
        existing_user = User.objects.filter(email__iexact=email).first()

        if existing_user:
            # If user exists but is inactive → reactivation flow
            if not existing_user.is_active:
                token = generate_email_verification_token(existing_user)
                send_verification_email(existing_user, token)

            # Always return generic success message
            return success(
                message=(
                    "Nëse kjo email nuk është regjistruar ose është çaktivizuar, "
                    "do të merrni një email për verifikim ose riaktivizim."
                )
            )

        # --------------------------------------------------
        # 🆕 Create new user
        # --------------------------------------------------
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        token = generate_email_verification_token(user)
        send_verification_email(user, token)

        return success(
            message=(
                "Nëse kjo email nuk është regjistruar ose është çaktivizuar, "
                "do të merrni një email për verifikim ose riaktivizim."
            )
        )




# ======================================================
# 👤 CUSTOMER PROFILE
# ======================================================

@api_view(["GET", "PUT", "PATCH"])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def customer_profile(request):
    user = request.user
    if request.method in ["PUT", "PATCH"] and not user.email_verified:
        return error(
            "Verifikoni email-in para se të plotësoni profilin.",
            403
        )
    
    if not hasattr(user, "customer_profile"):
        return error("Ky llogari nuk është klient.", 403)

    customer = user.customer_profile

    if request.method == "GET":
        serializer = CustomerProfileSerializer(customer)
        return success(data=serializer.data)

    serializer = CustomerProfileSerializer(
        customer,
        data=request.data,
        partial=True
    )

    if serializer.is_valid():
        serializer.save()
        return success(
            message="Profili u përditësua me sukses.",
            data=serializer.data
        )

    return error(serializer.errors, 400)





# ======================================================
# 🏢 COMPANY PROFILE
# ======================================================

@api_view(["GET", "PUT", "PATCH"])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def company_profile(request):
    user = request.user
    if not user.email_verified:
        return error(
            "Verifikoni email-in para se të plotësoni profilin.",
            403
        )
    if not hasattr(user, "company_profile"):
        return error("Ky llogari nuk është kompani.", 403)

    company = user.company_profile

    # 🔹 GET – visa full CompanyProfile
    if request.method == "GET":
        serializer = CompanySerializer(company, context={"request": request})
        return success(data=serializer.data)

    # 🔹 PUT / PATCH – uppdatera via serializer (SÄKERT)
    print("FILES:", request.FILES)
    print("DATA:", request.data)
    # 🔹 PUT / PATCH – uppdatera via serializer (SÄKERT)
    serializer = CompanySerializer(
        company,
        data=request.data,
        partial=True,
        context={"request": request},
    )

    if serializer.is_valid():
        serializer.save()
        return success(
            message="Profili i kompanisë u përditësua me sukses.",
            data=serializer.data,
        )

    return error(serializer.errors, 400)



# ======================================================
# 🏢 CUSTOMER CONSENT
# ======================================================

class CustomerConsentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not hasattr(request.user, "customer_profile"):
            return error("Vetëm klientët mund ta kryejnë këtë veprim.", 403)

        customer = request.user.customer_profile

        serializer = CustomerConsentSerializer(
            customer,
            data=request.data,
            context={"request": request},
        )

        serializer.is_valid(raise_exception=True)
        serializer.save()

        return success("Pëlqimi u regjistrua me sukses")


# ======================================================
# 🇦🇱 SOFT DELETE USER
# ======================================================

class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        user = request.user
        password = request.data.get("password")
        refresh_token = request.data.get("refresh")

        if not password:
            return error("Ju lutem konfirmoni fjalëkalimin.", 400)

        if not user.check_password(password):
            return error("Fjalëkalimi është i pasaktë.", 400)

        # 🔐 Blacklist refresh token (log out immediately)
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except TokenError:
                pass

        # 🔹 Soft deactivate company if exists
        if hasattr(user, "company_profile"):
            company = user.company_profile
            company.is_active = False
            company.archived_at = timezone.now()
            company.save(update_fields=["is_active", "archived_at"])

        # 🔐 Soft deactivate user
        user.is_active = False
        user.email_verified = False
        user.email_verified_at = None
        user.save(update_fields=["is_active", "email_verified", "email_verified_at"])

        return success("Llogaria u çaktivizua me sukses.")
    
# ======================================================
# 🇦🇱 RESET PASSWORD
# ======================================================
class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")

        if not email:
            return error("Email mungon.", 400)

        user = User.objects.filter(email__iexact=email, is_active=True).first()

        if user:
            token = PasswordResetTokenGenerator().make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}"

            try:
                send_password_reset_email(user, reset_url)
            except Exception:
                pass
        
        return success("Nëse email ekziston, do të merrni një link për rivendosje.")


class ResetPasswordConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uid = request.data.get("uid")
        token = request.data.get("token")
        password = request.data.get("password")

        if not uid or not token or not password:
            return error("Kërkesa është e pavlefshme.", 400)

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
        except:
            return error("Linku është i pavlefshëm.", 400)

        user = User.objects.filter(pk=user_id, is_active=True).first()

        if not user:
            return error("Linku është i pavlefshëm.", 400)

        if not PasswordResetTokenGenerator().check_token(user, token):
            return error("Linku është i pavlefshëm ose ka skaduar.", 400)

        try:
            validate_password(password, user)
        except ValidationError as e:
            return error(e.messages, 400)

        user.set_password(password)
        user.save()

        return success("Fjalëkalimi u përditësua me sukses.")