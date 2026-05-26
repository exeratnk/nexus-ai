import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Расширенная модель пользователя."""

    bio = models.TextField(blank=True, default='')
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.username


class Subscription(models.Model):
    """Текущий тариф и состояние подписки пользователя."""

    class Plan(models.TextChoices):
        FREE = 'free', 'Free'
        PRO = 'pro', 'Pro'

    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        CANCELED = 'canceled', 'Canceled'
        PAST_DUE = 'past_due', 'Past due'
        INCOMPLETE = 'incomplete', 'Incomplete'

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='subscription')
    plan = models.CharField(max_length=16, choices=Plan.choices, default=Plan.FREE)
    subscription_status = models.CharField(
        max_length=24,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    current_period_end = models.DateTimeField(blank=True, null=True)
    provider_customer_id = models.CharField(max_length=255, blank=True, default='')
    provider_subscription_id = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-created_at',)

    @property
    def is_pro(self):
        return self.plan == self.Plan.PRO

    def __str__(self):
        return f'{self.user.username}: {self.plan} ({self.subscription_status})'


class DailyMessageUsage(models.Model):
    """Сколько AI-сообщений пользователь использовал за день."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='daily_message_usage')
    date = models.DateField()
    messages_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ('-date',)
        unique_together = ('user', 'date')

    def __str__(self):
        return f'{self.user.username}: {self.date} ({self.messages_count})'


class SubscriptionCheckoutSession(models.Model):
    """Checkout-сессия для перехода на платный тариф."""

    class Provider(models.TextChoices):
        DEMO = 'demo', 'Demo provider'

    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        PROCESSING = 'processing', 'Processing'
        PAID = 'paid', 'Paid'
        FAILED = 'failed', 'Failed'
        CANCELED = 'canceled', 'Canceled'
        EXPIRED = 'expired', 'Expired'

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='subscription_checkout_sessions',
    )
    target_plan = models.CharField(max_length=16, choices=Subscription.Plan.choices)
    provider = models.CharField(max_length=16, choices=Provider.choices, default=Provider.DEMO)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.OPEN)
    amount = models.PositiveIntegerField(default=0)
    currency = models.CharField(max_length=8, default='RUB')
    checkout_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    provider_session_id = models.CharField(max_length=255, blank=True, default='')
    provider_payment_id = models.CharField(max_length=255, blank=True, default='')
    success_url = models.CharField(max_length=500, blank=True, default='')
    cancel_url = models.CharField(max_length=500, blank=True, default='')
    metadata = models.JSONField(default=dict, blank=True)
    expires_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-created_at',)

    @property
    def is_terminal(self):
        return self.status in {
            self.Status.PAID,
            self.Status.FAILED,
            self.Status.CANCELED,
            self.Status.EXPIRED,
        }

    def __str__(self):
        return f'{self.user.username}: {self.target_plan} ({self.status})'


class ProjectFolder(models.Model):
    """Папка, в которую пользователь может группировать проекты."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='project_folders')
    name = models.CharField(max_length=255)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('created',)
        unique_together = ('user', 'name')

    def __str__(self):
        return f'{self.user.username}: {self.name}'


class Chat(models.Model):
    """Диалог пользователя."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chats')
    folder = models.ForeignKey(
        ProjectFolder,
        on_delete=models.CASCADE,
        related_name='chats',
        blank=True,
        null=True,
    )
    name = models.CharField(max_length=255)
    messages = models.JSONField(default=list, blank=True)
    model = models.CharField(max_length=64, default='gpt-4o')
    deep_mode = models.BooleanField(default=False)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('created',)

    def __str__(self):
        return f'{self.user.username}: {self.name}'
