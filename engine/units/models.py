from django.conf import settings
from django.db import models


class Unit(models.Model):
    SINGLE_ROOM = 'single_room'
    STUDIO = 'studio'
    BEDSITTER = 'bedsitter'
    ONE_BED = '1br'
    TWO_BED = '2br'
    THREE_BED = '3br'
    SHOP = 'shop'
    OFFICE = 'office'
    OTHER = 'other'

    UNIT_TYPE_CHOICES = [
        (SINGLE_ROOM, 'Single Room'),
        (STUDIO, 'Studio'),
        (BEDSITTER, 'Bedsitter'),
        (ONE_BED, '1BR'),
        (TWO_BED, '2BR'),
        (THREE_BED, '3BR'),
        (SHOP, 'Shop'),
        (OFFICE, 'Office'),
        (OTHER, 'Other'),
    ]

    OCCUPIED = 'occupied'
    VACANT = 'vacant'

    STATUS_CHOICES = [
        (OCCUPIED, 'Occupied'),
        (VACANT, 'Vacant'),
    ]

    property = models.ForeignKey('properties.Property', related_name='units', on_delete=models.CASCADE)
    unit_number = models.CharField(max_length=64)
    unit_type = models.CharField(max_length=32, choices=UNIT_TYPE_CHOICES, default=BEDSITTER)
    unit_type_custom = models.CharField(max_length=64, blank=True, default='')
    rent_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=VACANT)
    date_added = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('property', 'unit_number')

    def __str__(self):
        return f"{self.property.name} - {self.unit_number}"


class TenantUnit(models.Model):
    tenant = models.ForeignKey('tenants.Tenant', related_name='tenant_units', on_delete=models.CASCADE)
    unit = models.ForeignKey(Unit, related_name='tenant_units', on_delete=models.CASCADE)
    move_in_date = models.DateField()
    move_out_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('tenant', 'unit', 'move_in_date')

    def __str__(self):
        return f"{self.tenant.full_name} -> {self.unit}"


class MaintenanceRequest(models.Model):
    LOW = 'low'
    MEDIUM = 'medium'
    URGENT = 'urgent'

    PRIORITY_CHOICES = [
        (LOW, 'Low'),
        (MEDIUM, 'Medium'),
        (URGENT, 'Urgent'),
    ]

    OPEN = 'open'
    IN_PROGRESS = 'in_progress'
    RESOLVED = 'resolved'

    STATUS_CHOICES = [
        (OPEN, 'Open'),
        (IN_PROGRESS, 'In Progress'),
        (RESOLVED, 'Resolved'),
    ]

    unit = models.ForeignKey(Unit, related_name='maintenance_requests', on_delete=models.CASCADE)
    reported_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    description = models.TextField()
    priority = models.CharField(max_length=16, choices=PRIORITY_CHOICES, default=MEDIUM)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=OPEN)
    date_reported = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Request {self.unit} {self.priority}"


class MaintenanceAssignment(models.Model):
    request = models.ForeignKey(MaintenanceRequest, related_name='assignments', on_delete=models.CASCADE)
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    assigned_date = models.DateField(auto_now_add=True)
    resolved_date = models.DateField(null=True, blank=True)
    cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"Assignment {self.request.id}"


class Expense(models.Model):
    REPAIR = 'repair'
    UTILITY = 'utility'
    CLEANING = 'cleaning'
    OTHER = 'other'

    CATEGORY_CHOICES = [
        (REPAIR, 'Repair'),
        (UTILITY, 'Utility'),
        (CLEANING, 'Cleaning'),
        (OTHER, 'Other'),
    ]

    property = models.ForeignKey('properties.Property', related_name='expenses', on_delete=models.CASCADE)
    unit = models.ForeignKey(Unit, related_name='expenses', null=True, blank=True, on_delete=models.SET_NULL)
    category = models.CharField(max_length=32, choices=CATEGORY_CHOICES, default=OTHER)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    description = models.TextField(blank=True)
    added_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)

    def __str__(self):
        return f"Expense {self.category} - {self.amount}"
