# Generated manually for subscription checkout sessions
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_subscription_dailymessageusage'),
    ]

    operations = [
        migrations.CreateModel(
            name='SubscriptionCheckoutSession',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('target_plan', models.CharField(choices=[('free', 'Free'), ('pro', 'Pro')], max_length=16)),
                ('provider', models.CharField(choices=[('demo', 'Demo provider')], default='demo', max_length=16)),
                ('status', models.CharField(choices=[('open', 'Open'), ('processing', 'Processing'), ('paid', 'Paid'), ('failed', 'Failed'), ('canceled', 'Canceled'), ('expired', 'Expired')], default='open', max_length=16)),
                ('amount', models.PositiveIntegerField(default=0)),
                ('currency', models.CharField(default='RUB', max_length=8)),
                ('checkout_token', models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ('provider_session_id', models.CharField(blank=True, default='', max_length=255)),
                ('provider_payment_id', models.CharField(blank=True, default='', max_length=255)),
                ('success_url', models.CharField(blank=True, default='', max_length=500)),
                ('cancel_url', models.CharField(blank=True, default='', max_length=500)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('expires_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='subscription_checkout_sessions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ('-created_at',),
            },
        ),
    ]
