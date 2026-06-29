from django.urls import path

from .views import PlatformUpdateDetailView, PlatformUpdateListView


urlpatterns = [
    path("perditesime/", PlatformUpdateListView.as_view(), name="platform-updates-albanian"),
    path("perditesime/<slug:slug>/", PlatformUpdateDetailView.as_view(), name="platform-update-detail-albanian"),
    path("updates/", PlatformUpdateListView.as_view(), name="platform-updates"),
    path("updates/<slug:slug>/", PlatformUpdateDetailView.as_view(), name="platform-update-detail"),
]
