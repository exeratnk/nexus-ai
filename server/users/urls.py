from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    RegisterView,
    LogoutView,
    ProfileView,
    SubscriptionPlansView,
    SubscriptionChangeView,
    SubscriptionCancelView,
    SubscriptionCheckoutCreateView,
    SubscriptionCheckoutDetailView,
    SubscriptionCheckoutPayView,
    SubscriptionWebhookView,
    ProjectFolderListCreateView,
    ProjectFolderDetailView,
    ChatListCreateView,
    ChatDetailView,
    LLMChatView,
    LLMChatStopView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('subscription/plans/', SubscriptionPlansView.as_view(), name='subscription-plans'),
    path('subscription/change/', SubscriptionChangeView.as_view(), name='subscription-change'),
    path('subscription/cancel/', SubscriptionCancelView.as_view(), name='subscription-cancel'),
    path('subscription/checkout/', SubscriptionCheckoutCreateView.as_view(), name='subscription-checkout-create'),
    path('subscription/checkout/<uuid:checkout_token>/', SubscriptionCheckoutDetailView.as_view(), name='subscription-checkout-detail'),
    path('subscription/checkout/<uuid:checkout_token>/pay/', SubscriptionCheckoutPayView.as_view(), name='subscription-checkout-pay'),
    path('subscription/webhook/', SubscriptionWebhookView.as_view(), name='subscription-webhook'),
    path('folders/', ProjectFolderListCreateView.as_view(), name='folder-list'),
    path('folders/<int:pk>/', ProjectFolderDetailView.as_view(), name='folder-detail'),
    path('chats/', ChatListCreateView.as_view(), name='chat-list'),
    path('chats/<int:pk>/', ChatDetailView.as_view(), name='chat-detail'),
    path('llm/chat/', LLMChatView.as_view(), name='llm-chat'),
    path('llm/chat/stop/', LLMChatStopView.as_view(), name='llm-chat-stop'),
]
