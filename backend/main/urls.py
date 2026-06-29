from django.urls import path

from .views import PlatformUpdateDetailView, PlatformUpdateListView


urlpatterns = [
    path("updates/", PlatformUpdateListView.as_view(), name="platform-updates"),
    path("updates/<slug:slug>/", PlatformUpdateDetailView.as_view(), name="platform-update-detail"),
]
