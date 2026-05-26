from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .llm import LLMRequestCancelled, LLMServiceError, cancel_chat, complete_chat
from .llm_serializers import LLMChatRequestSerializer, LLMChatStopRequestSerializer
from .models import User, Chat, ProjectFolder, Subscription, SubscriptionCheckoutSession
from .serializers import (
    RegisterSerializer,
    ProfileSerializer,
    ChatSerializer,
    ProjectFolderSerializer,
    SubscriptionCheckoutCreateSerializer,
    SubscriptionCheckoutPaymentSerializer,
    SubscriptionPlanChangeSerializer,
)
from .subscriptions import (
    cancel_pro_subscription,
    can_use_deep_mode,
    create_checkout_session,
    ensure_subscription,
    get_daily_limit,
    get_effective_plan,
    get_subscription_catalog,
    get_today_usage_count,
    increment_daily_usage,
    model_requires_pro,
    process_checkout_webhook,
    serialize_checkout_session,
    simulate_checkout_payment,
)


def _build_subscription_error_payload(user, detail, error_code):
    return {
        'detail': detail,
        'error_code': error_code,
        'subscription': ProfileSerializer(user).data['subscription'],
    }


class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/"""
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Сразу возвращаем токены после регистрации
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': ProfileSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_201_CREATED)


class LogoutView(APIView):
    """POST /api/auth/logout/  — инвалидирует refresh-токен."""
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        try:
            refresh_token = request.data['refresh']
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'detail': 'Успешный выход.'}, status=status.HTTP_205_RESET_CONTENT)
        except Exception:
            return Response({'detail': 'Неверный токен.'}, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(generics.RetrieveUpdateAPIView):
    """GET / PATCH /api/auth/profile/"""
    serializer_class = ProfileSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user


class SubscriptionPlansView(APIView):
    """GET /api/auth/subscription/plans/"""
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        current_plan = None
        if request.user.is_authenticated:
            current_plan = get_effective_plan(ensure_subscription(request.user))

        return Response({
            'plans': get_subscription_catalog(),
            'current_plan': current_plan,
        }, status=status.HTTP_200_OK)


class SubscriptionChangeView(APIView):
    """POST /api/auth/subscription/change/"""
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        serializer = SubscriptionPlanChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        plan = serializer.validated_data['plan']

        if plan == Subscription.Plan.PRO:
            return Response({
                'detail': 'Для перехода на Pro требуется checkout.',
                'error_code': 'checkout_required',
                'plans': get_subscription_catalog(),
            }, status=status.HTTP_409_CONFLICT)

        subscription = ensure_subscription(request.user)
        if subscription.is_pro:
            return Response(
                _build_subscription_error_payload(
                    request.user,
                    'Нельзя перейти на Free при активном тарифе Pro.',
                    'downgrade_disabled',
                ),
                status=status.HTTP_409_CONFLICT,
            )

        cancel_pro_subscription(request.user)
        return Response({
            'detail': 'Тариф изменён на Free.',
            'user': ProfileSerializer(request.user).data,
        }, status=status.HTTP_200_OK)


class SubscriptionCancelView(APIView):
    """POST /api/auth/subscription/cancel/"""
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        subscription = ensure_subscription(request.user)
        if subscription.is_pro:
            return Response(
                _build_subscription_error_payload(
                    request.user,
                    'Отмена активного тарифа Pro недоступна.',
                    'downgrade_disabled',
                ),
                status=status.HTTP_409_CONFLICT,
            )

        cancel_pro_subscription(request.user)
        return Response({
            'detail': 'Подписка переведена на Free.',
            'user': ProfileSerializer(request.user).data,
        }, status=status.HTTP_200_OK)


class SubscriptionCheckoutCreateView(APIView):
    """POST /api/auth/subscription/checkout/"""
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        serializer = SubscriptionCheckoutCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            checkout = create_checkout_session(
                request.user,
                data['plan'],
                success_url=data.get('success_url', ''),
                cancel_url=data.get('cancel_url', ''),
            )
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'detail': 'Checkout создан.',
            'checkout': serialize_checkout_session(checkout),
        }, status=status.HTTP_201_CREATED)


class SubscriptionCheckoutDetailView(APIView):
    """GET /api/auth/subscription/checkout/<token>/"""
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request, checkout_token):
        checkout = generics.get_object_or_404(
            SubscriptionCheckoutSession,
            checkout_token=checkout_token,
            user=request.user,
        )
        return Response({
            'checkout': serialize_checkout_session(checkout),
            'user': ProfileSerializer(request.user).data,
        }, status=status.HTTP_200_OK)


class SubscriptionCheckoutPayView(APIView):
    """POST /api/auth/subscription/checkout/<token>/pay/"""
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, checkout_token):
        serializer = SubscriptionCheckoutPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        checkout = generics.get_object_or_404(
            SubscriptionCheckoutSession,
            checkout_token=checkout_token,
            user=request.user,
        )

        try:
            checkout = simulate_checkout_payment(checkout, serializer.validated_data)
        except ValueError as exc:
            checkout.refresh_from_db()
            return Response({
                'detail': str(exc),
                'checkout': serialize_checkout_session(checkout),
            }, status=status.HTTP_409_CONFLICT)

        request.user.refresh_from_db()
        return Response({
            'detail': 'Оплата подтверждена.',
            'checkout': serialize_checkout_session(checkout),
            'user': ProfileSerializer(request.user).data,
        }, status=status.HTTP_200_OK)


class SubscriptionWebhookView(APIView):
    """POST /api/auth/subscription/webhook/"""
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        expected_token = getattr(settings, 'SUBSCRIPTION_WEBHOOK_TOKEN', 'nexus-demo-webhook')
        if expected_token and request.headers.get('X-Webhook-Token') != expected_token:
            return Response({'detail': 'Webhook token invalid.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            checkout = process_checkout_webhook(request.data)
        except SubscriptionCheckoutSession.DoesNotExist:
            return Response({'detail': 'Checkout не найден.'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        checkout.user.refresh_from_db()
        return Response({
            'detail': 'Webhook обработан.',
            'checkout': serialize_checkout_session(checkout),
            'user': ProfileSerializer(checkout.user).data,
        }, status=status.HTTP_200_OK)


class ProjectFolderListCreateView(generics.ListCreateAPIView):
    """GET / POST /api/auth/folders/"""
    serializer_class = ProjectFolderSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return ProjectFolder.objects.filter(user=self.request.user).order_by('created')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ProjectFolderDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET / PATCH / DELETE /api/auth/folders/<id>/"""
    serializer_class = ProjectFolderSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return ProjectFolder.objects.filter(user=self.request.user)


class ChatListCreateView(generics.ListCreateAPIView):
    """GET / POST /api/auth/chats/"""
    serializer_class = ChatSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Chat.objects.filter(user=self.request.user).order_by('created')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ChatDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET / PATCH / DELETE /api/auth/chats/<id>/"""
    serializer_class = ChatSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Chat.objects.filter(user=self.request.user)


class LLMChatView(APIView):
    """POST /api/auth/llm/chat/"""
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = LLMChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        user = request.user if request.user.is_authenticated else None

        if user is not None:
            subscription = ensure_subscription(user)
            model_name = validated.get('model') or ''
            deep_mode = validated.get('deep_mode', False)

            if model_requires_pro(model_name) and not subscription.is_pro:
                return Response(
                    _build_subscription_error_payload(
                        user,
                        f'Модель {model_name} доступна только на тарифе Pro.',
                        'pro_feature_required',
                    ),
                    status=status.HTTP_403_FORBIDDEN,
                )

            if deep_mode and not can_use_deep_mode(subscription):
                return Response(
                    _build_subscription_error_payload(
                        user,
                        'Глубокий режим доступен только на тарифе Pro.',
                        'pro_feature_required',
                    ),
                    status=status.HTTP_403_FORBIDDEN,
                )

            daily_limit = get_daily_limit(subscription)
            daily_used = get_today_usage_count(user)
            if daily_limit is not None and daily_used >= daily_limit:
                return Response(
                    _build_subscription_error_payload(
                        user,
                        (
                            f'Лимит Free тарифа на сегодня исчерпан: {daily_limit} '
                            'сообщений в день. Перейдите на Pro, чтобы продолжить.'
                        ),
                        'free_daily_limit_exceeded',
                    ),
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

        try:
            text = complete_chat(
                validated['messages'],
                deep_mode=validated.get('deep_mode', False),
                request_id=validated.get('request_id'),
            )
        except LLMRequestCancelled:
            return Response({'detail': 'Генерация остановлена.'}, status=status.HTTP_409_CONFLICT)
        except LLMServiceError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        if user is not None:
            increment_daily_usage(user)

        return Response({
            'message': {
                'role': 'bot',
                'text': text,
            }
        }, status=status.HTTP_200_OK)


class LLMChatStopView(APIView):
    """POST /api/auth/llm/chat/stop/"""
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = LLMChatStopRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        stopped = cancel_chat(serializer.validated_data['request_id'])
        return Response({'stopped': stopped}, status=status.HTTP_200_OK)
