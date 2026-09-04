from django.urls import path

from .views import DeviceRegisterView, DeviceUnregisterView, NotificationPreferenceView


urlpatterns = [
    path("devices/register/", DeviceRegisterView.as_view(), name="notification-device-register"),
    path("devices/unregister/", DeviceUnregisterView.as_view(), name="notification-device-unregister"),
    path("preferences/", NotificationPreferenceView.as_view(), name="notification-preferences"),
]
