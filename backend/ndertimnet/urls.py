#backend/ndertimnet/urls.py

from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.conf import settings
from django.conf.urls.static import static


# 📚 (valfritt) API-dokumentation via drf-spectacular
try:
    from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
    SPECTACULAR_ENABLED = True
except ImportError:
    SPECTACULAR_ENABLED = False

urlpatterns = [
    # 🧱 Admin panel
    path("admin/", admin.site.urls),

    # 👤 Accounts API
    path("api/accounts/", include("accounts.urls")),

    # 🧩 Taxonomy API  
    path("api/taxonomy/", include("taxonomy.urls")),

    # Locations API
    path("api/locations/", include("locations.urls")),

    # 🧱 Leads & Payments API
    path("api/leads/", include("leads.urls")),
    
    # 🧱 User JobRequests
    path("api/jobrequests/", include("jobrequests.urls")),

    # 🔐 JWT Token endpoints
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # 🧭 Redirect standardprofil till admin
    path("accounts/profile/", lambda request: redirect("/admin/")),

    # ⚙️ Browsable API login
    path("api-auth/", include("rest_framework.urls")),

    # ⚙️ Payments API 
    path("api/payments/", include("payments.urls")),

    # ⚙️ Offers app
    path("api/offers/", include("offers.urls")),


]

# 📘 Lägg till API-dokumentation endast om drf-spectacular är installerat
if SPECTACULAR_ENABLED:
    urlpatterns += [
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    ]

# 🖼️ Media-filer (t.ex. företagslogotyper)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
