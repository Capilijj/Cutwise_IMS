from rest_framework import viewsets, status
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import LeatherType, SizeType, Transaction, User
from .serializers import LeatherTypeSerializer, SizeTypeSerializer, TransactionSerializer, UserSerializer


class LeatherTypeViewSet(viewsets.ModelViewSet):
    queryset         = LeatherType.objects.all()
    serializer_class = LeatherTypeSerializer
    filter_backends  = [SearchFilter, OrderingFilter]
    search_fields    = ["name", "tag"]
    ordering_fields  = ["name", "created_at"]


class SizeTypeViewSet(viewsets.ModelViewSet):
    queryset         = SizeType.objects.all()
    serializer_class = SizeTypeSerializer
    filter_backends  = [SearchFilter, OrderingFilter]
    search_fields    = ["name"]
    ordering_fields  = ["name", "created_at"]


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only — users are managed outside this subsystem for now.
    GET  /api/users/
    GET  /api/users/{id}/
    """
    queryset         = User.objects.all()
    serializer_class = UserSerializer


class TransactionViewSet(viewsets.ModelViewSet):
    queryset         = Transaction.objects.select_related(
        "leather_type", "size_type", "encoded_by"
    ).all()
    serializer_class = TransactionSerializer
    filter_backends  = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "leather_type", "size_type", "encoded_by"]
    search_fields    = ["id", "customer_name", "leather_name_snapshot"]
    ordering_fields  = ["created_at", "total_amount", "status"]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        txn_id   = instance.id
        self.perform_destroy(instance)
        return Response(
            {"detail": f"Transaction {txn_id} deleted successfully."},
            status=status.HTTP_200_OK
        )