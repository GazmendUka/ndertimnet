# accounts/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    UserViewSet,
    CustomerViewSet,
    RegisterCompanyView,
    RegisterCustomerView,
    LoginView,  
    current_user,
    customer_profile,
    company_profile,
    CustomerConsentView,
    VerifyEmailView,
    ResendVerificationEmailView,
)


router = DefaultRouter()
router.register(r"users", UserViewSet)
router.register(r"customers", CustomerViewSet)

urlpatterns = [
    path("", include(router.urls)),

    path("login/", LoginView.as_view(), name="login"),
    path("me/", current_user, name="current_user"),

    path("register/company/", RegisterCompanyView.as_view(), name="register-company"),
    path("register/customer/", RegisterCustomerView.as_view(), name="register-customer"),

    path("profile/customer/", customer_profile, name="customer-profile"),
    path("profile/company/", company_profile, name="company-profile"),

    # 🔐 JobRequest steg 5 – Consent
    path("customer/consent/", CustomerConsentView.as_view(), name="customer-consent"),

    # ✉️ Email verification
    path("verify-email/<uuid:token>/", VerifyEmailView.as_view(), name="verify-email"),
    path("resend-verification/", ResendVerificationEmailView.as_view(), name="resend-verification"),
]

