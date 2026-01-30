# backend/offers/urls.py

from rest_framework.routers import DefaultRouter
from .views import OfferViewSet

router = DefaultRouter()
router.register(r"", OfferViewSet, basename="offers")

urlpatterns = router.urls
