# backend/taxonomy/views.py

from rest_framework import viewsets, permissions
from .models import Profession
from .serializers import ProfessionSerializer

#class ProfessionViewSet(viewsets.ReadOnlyModelViewSet):
#    queryset = Profession.objects.filter(is_active=True)
#    serializer_class = ProfessionSerializer
#    permission_classes = [permissions.AllowAny]


# backend/taxonomy/views.py
class ProfessionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Profession.objects.all()
    serializer_class = ProfessionSerializer
    permission_classes = [permissions.AllowAny]
