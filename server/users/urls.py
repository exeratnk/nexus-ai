from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    RegisterView,
    LogoutView,
    ProfileView,
    ProjectFolderListCreateView,
    ProjectFolderDetailView,
    ChatListCreateView,
    ChatDetailView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('folders/', ProjectFolderListCreateView.as_view(), name='folder-list'),
    path('folders/<int:pk>/', ProjectFolderDetailView.as_view(), name='folder-detail'),
    path('chats/', ChatListCreateView.as_view(), name='chat-list'),
    path('chats/<int:pk>/', ChatDetailView.as_view(), name='chat-detail'),
]
