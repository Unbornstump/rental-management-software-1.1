from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.contrib.auth import get_user_model
from core.permissions import RolePermission
from .models import Property, Landlord, LandlordProperty, Commission, LandlordPayout, PenaltyRule
from .serializers import (
    PropertySerializer, LandlordSerializer, LandlordPropertySerializer,
    CommissionSerializer, LandlordPayoutSerializer, PenaltyRuleSerializer
)

User = get_user_model()


class PropertyViewSet(viewsets.ModelViewSet):
    queryset = Property.objects.all().order_by('-date_added')
    serializer_class = PropertySerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        property_obj = self.get_object()
        # Cascade delete handled by Django, but we might want to add logic here
        property_obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class LandlordViewSet(viewsets.ModelViewSet):
    queryset = Landlord.objects.all().order_by('full_name')
    serializer_class = LandlordSerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]


class LandlordPropertyViewSet(viewsets.ModelViewSet):
    queryset = LandlordProperty.objects.select_related('landlord', 'property').all()
    serializer_class = LandlordPropertySerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]


class CommissionViewSet(viewsets.ModelViewSet):
    queryset = Commission.objects.select_related('landlord', 'property', 'payment').all()
    serializer_class = CommissionSerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]


class LandlordPayoutViewSet(viewsets.ModelViewSet):
    queryset = LandlordPayout.objects.select_related('landlord', 'property').all()
    serializer_class = LandlordPayoutSerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]


class PenaltyRuleViewSet(viewsets.ModelViewSet):
    queryset = PenaltyRule.objects.select_related('property').all()
    serializer_class = PenaltyRuleSerializer
    permission_classes = [permissions.IsAuthenticated, RolePermission([User.MANAGER])]
