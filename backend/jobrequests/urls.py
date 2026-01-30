# ------------------------------------------------------------
# backend/jobrequests/urls.py
# ------------------------------------------------------------
from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import JobRequestViewSet, JobRequestDraftViewSet

router = DefaultRouter()

# 1️⃣ Drafts först – annars blir det route-konflikt!
router.register(r'drafts', JobRequestDraftViewSet, basename='jobrequest-drafts')

# 2️⃣ Huvud-jobrequests (list/create/detail)
router.register(r'', JobRequestViewSet, basename='jobrequest')

urlpatterns = [
    path('', include(router.urls)),
]
