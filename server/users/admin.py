from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User, Chat, ProjectFolder


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
