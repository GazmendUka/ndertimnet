####################################
# backend/leads/urls.py
####################################
from django.urls import path, include
from rest_framework import routers
from .views import JobRequestViewSet, LeadMatchViewSet, LeadMessageViewSet 

# 🇦🇱 Router për Kërkesa & Oferta
router = routers.DefaultRouter()
router.register(r'jobrequests', JobRequestViewSet, basename='jobrequest')
router.register(r'leadmatches', LeadMatchViewSet, basename='leadmatch')
router.register(r'leadmessages', LeadMessageViewSet, basename='leadmessage')  

urlpatterns = [
    path('', include(router.urls)),
]
