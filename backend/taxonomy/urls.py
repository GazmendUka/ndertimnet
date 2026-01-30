# backend/taxonomy/urls.py

from rest_framework.routers import DefaultRouter
from .views import ProfessionViewSet

router = DefaultRouter()
router.register(r"professions", ProfessionViewSet, basename="profession")

urlpatterns = router.urls
