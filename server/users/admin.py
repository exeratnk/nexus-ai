from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import (
    User,
    Chat,
    ProjectFolder,
    Subscription,
    DailyMessageUsage,
)
from .subscriptions import normalize_subscription_state


class SubscriptionInline(admin.StackedInline):
    model = Subscription
    extra = 1
    max_num = 1
    can_delete = False
    fields = (
        'plan',
        'current_period_end',
        'provider_customer_id',
        'provider_subscription_id',
    )


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Profile', {'fields': ('bio', 'avatar')}),
    )
    inlines = (SubscriptionInline,)
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
    fields = (
        'user',
        'plan',
        'current_period_end',
        'provider_customer_id',
        'provider_subscription_id',
    )
    list_display = ('user', 'plan', 'current_period_end', 'updated_at')
    list_filter = ('plan',)
    search_fields = ('user__username', 'user__email', 'provider_customer_id', 'provider_subscription_id')

    def save_model(self, request, obj, form, change):
        normalize_subscription_state(obj, persist=False)
        super().save_model(request, obj, form, change)


@admin.register(DailyMessageUsage)
class DailyMessageUsageAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'messages_count')
    list_filter = ('date',)
    search_fields = ('user__username', 'user__email')
