from decimal import Decimal
import django.core.validators
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('financials', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='PaymentTransaction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12, validators=[django.core.validators.MinValueValidator(Decimal('0.01'))])),
                ('payment_method', models.CharField(blank=True, choices=[('cash', 'Cash'), ('mpesa', 'M-Pesa'), ('bank_transfer', 'Bank Transfer'), ('cheque', 'Cheque')], max_length=32)),
                ('reference_number', models.CharField(blank=True, max_length=128)),
                ('payment_date', models.DateField()),
                ('notes', models.TextField(blank=True)),
                ('receipt_number', models.CharField(blank=True, max_length=32)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('recorded_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ('rent_payment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='transactions', to='financials.rentpayment')),
            ],
            options={
                'ordering': ['payment_date', 'created_at'],
            },
        ),
    ]
