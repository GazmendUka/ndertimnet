from django.urls import path

from .views import PlatformUpdateListView


urlpatterns = [
    path("updates/", PlatformUpdateListView.as_view(), name="platform-updates"),
]
