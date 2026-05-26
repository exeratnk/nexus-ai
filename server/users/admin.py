from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import (
    User,
    Chat,
    ProjectFolder,
    Subscription,
    DailyMessageUsage,
    SubscriptionCheckoutSession,
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Profile', {'fields': ('bio', 'avatar')}),
    )
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'is_active')
    search_fields = ('username', 'email', 'first_name', 'last_name')


@admin.register(Chat)
class ChatAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'name', 'folder', 'model', 'deep_mode', 'created', 'updated')
    list_filter = ('folder', 'model', 'deep_mode', 'created')
    search_fields = ('name', 'user__username', 'user__email')


@admin.register(ProjectFolder)
class ProjectFolderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'name', 'created', 'updated')
    search_fields = ('name', 'user__username', 'user__email')


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'plan', 'subscription_status', 'current_period_end', 'updated_at')
    list_filter = ('plan', 'subscription_status')
    search_fields = ('user__username', 'user__email', 'provider_customer_id', 'provider_subscription_id')


@admin.register(DailyMessageUsage)
class DailyMessageUsageAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'messages_count')
    list_filter = ('date',)
    search_fields = ('user__username', 'user__email')


@admin.register(SubscriptionCheckoutSession)
class SubscriptionCheckoutSessionAdmin(admin.ModelAdmin):
    list_display = ('user', 'target_plan', 'status', 'provider', 'amount', 'created_at', 'expires_at')
    list_filter = ('target_plan', 'status', 'provider')
    search_fields = (
        'user__username',
        'user__email',
        'provider_session_id',
        'provider_payment_id',
    )
