from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, Chat, ProjectFolder
from .serializers import RegisterSerializer, ProfileSerializer, ChatSerializer, ProjectFolderSerializer


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

    def perform_destroy(self, instance):
        Chat.objects.filter(user=self.request.user, folder=instance).update(folder=None)
        instance.delete()


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
