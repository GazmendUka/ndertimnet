# backend/taxonomy/urls.py

from rest_framework.routers import DefaultRouter
from .views import IndustryViewSet, ProfessionViewSet

router = DefaultRouter()
router.register(r"industries", IndustryViewSet, basename="industry")
router.register(r"professions", ProfessionViewSet, basename="profession")

urlpatterns = router.urls
