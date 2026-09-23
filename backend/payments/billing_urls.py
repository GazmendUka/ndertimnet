from rest_framework.routers import DefaultRouter
from .billing_views import BillingViewSet

router = DefaultRouter()
router.register("", BillingViewSet, basename="billing")
urlpatterns = router.urls
