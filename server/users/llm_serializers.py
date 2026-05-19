from rest_framework import serializers


class LLMChatRequestSerializer(serializers.Serializer):
    messages = serializers.ListField(child=serializers.DictField(), allow_empty=False)
    model = serializers.CharField(required=False, allow_blank=True)
    deep_mode = serializers.BooleanField(required=False, default=False)
    request_id = serializers.CharField(required=False, allow_blank=False, max_length=128)


class LLMChatStopRequestSerializer(serializers.Serializer):
    request_id = serializers.CharField(required=True, allow_blank=False, max_length=128)
