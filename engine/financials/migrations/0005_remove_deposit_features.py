from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('financials', '0004_depositpayment'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='paymenttransaction',
            name='deposit_amount',
        ),
        migrations.DeleteModel(
            name='DepositPayment',
        ),
    ]
