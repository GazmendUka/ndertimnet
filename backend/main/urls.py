from django.urls import path

from .views import (
    ActiveHeroAdvertisementView,
    HeroAdvertisementDetailView,
    PlatformUpdateDetailView,
    PlatformUpdateListView,
)


urlpatterns = [
    path("reklama/hero/", ActiveHeroAdvertisementView.as_view(), name="hero-advertisement-albanian"),
    path("reklama/<slug:slug>/", HeroAdvertisementDetailView.as_view(), name="hero-advertisement-detail-albanian"),
    path("advertisements/hero/", ActiveHeroAdvertisementView.as_view(), name="hero-advertisement"),
    path("advertisements/<slug:slug>/", HeroAdvertisementDetailView.as_view(), name="hero-advertisement-detail"),
    path("perditesime/", PlatformUpdateListView.as_view(), name="platform-updates-albanian"),
    path("perditesime/<slug:slug>/", PlatformUpdateDetailView.as_view(), name="platform-update-detail-albanian"),
    path("updates/", PlatformUpdateListView.as_view(), name="platform-updates"),
    path("updates/<slug:slug>/", PlatformUpdateDetailView.as_view(), name="platform-update-detail"),
]
