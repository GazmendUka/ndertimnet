from django.urls import path
from .contact import ContactView
from .marketing import CampaignListCreateView, CampaignWithdrawView
from .marketplace_metrics import MarketplaceMetricsView

from .views import (
    ActiveHeroAdvertisementView,
    HeroAdvertisementDetailView,
    PlatformUpdateDetailView,
    PlatformUpdateListView,
)


urlpatterns = [
    path("marketing/campaigns/", CampaignListCreateView.as_view(), name="marketing-campaigns"),
    path("marketing/campaigns/<int:pk>/withdraw/", CampaignWithdrawView.as_view(), name="marketing-withdraw"),
    path("marketplace/metrics/", MarketplaceMetricsView.as_view(), name="marketplace-metrics"),
    path("contact/", ContactView.as_view(), name="contact"),
    path("reklama/hero/", ActiveHeroAdvertisementView.as_view(), name="hero-advertisement-albanian"),
    path("reklama/<slug:slug>/", HeroAdvertisementDetailView.as_view(), name="hero-advertisement-detail-albanian"),
    path("advertisements/hero/", ActiveHeroAdvertisementView.as_view(), name="hero-advertisement"),
    path("advertisements/<slug:slug>/", HeroAdvertisementDetailView.as_view(), name="hero-advertisement-detail"),
    path("perditesime/", PlatformUpdateListView.as_view(), name="platform-updates-albanian"),
    path("perditesime/<slug:slug>/", PlatformUpdateDetailView.as_view(), name="platform-update-detail-albanian"),
    path("updates/", PlatformUpdateListView.as_view(), name="platform-updates"),
    path("updates/<slug:slug>/", PlatformUpdateDetailView.as_view(), name="platform-update-detail"),
]
