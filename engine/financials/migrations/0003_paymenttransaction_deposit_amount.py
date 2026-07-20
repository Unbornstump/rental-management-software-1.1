from decimal import Decimal
from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('financials', '0002_paymenttransaction'),
    ]

    operations = [
        migrations.AddField(
            model_name='paymenttransaction',
            name='deposit_amount',
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal('0.00'),
                max_digits=12,
                validators=[django.core.validators.MinValueValidator(Decimal('0.00'))],
            ),
        ),
    ]
