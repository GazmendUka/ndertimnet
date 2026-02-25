# backend/locations/views.py 

from rest_framework import viewsets, permissions
from .models import City
from .serializers import CitySerializer

class CityViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = City.objects.filter(is_active=True)
    serializer_class = CitySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None  
