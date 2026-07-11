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
    ForgotPasswordView,          
    ResetPasswordConfirmView,
    DeleteAccountView,
    public_company_profile,
    public_company_reviews,
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
    path("companies/<int:company_id>/public/", public_company_profile, name="public-company-profile"),
    path("companies/<int:company_id>/reviews/", public_company_reviews, name="public-company-reviews"),

    # 🔐 JobRequest steg 5 – Consent
    path("customer-consent/", CustomerConsentView.as_view(), name="customer-consent"),
    # ✉️ Email verification
    path("verify-email/", VerifyEmailView.as_view(), name="verify-email"),
    path("resend-verification/", ResendVerificationEmailView.as_view(), name="resend-verification"),
    
    path("account/delete/", DeleteAccountView.as_view(), name="delete-account"),
    
    # Reset password
    path("password/forgot/", ForgotPasswordView.as_view(), name="forgot-password"),
    path("password/reset/", ResetPasswordConfirmView.as_view(), name="reset-password"),
]
