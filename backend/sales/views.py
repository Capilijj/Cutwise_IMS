import json
import urllib.request
import urllib.error
import os
from django.conf import settings

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from authentication.permissions import CanCreateTransaction, CanDeleteTransaction, CanEditTransaction, IsAdminUser


def push_to_delivery_system(transaction):
    # prefer DELIVERY_API_URL name; fall back to DELIVERY_SYSTEM_URL for compatibility
    url = getattr(settings, "DELIVERY_API_URL", None) or os.environ.get("DELIVERY_API_URL")
    if not url:
        url = getattr(settings, "DELIVERY_SYSTEM_URL", None) or os.environ.get("DELIVERY_SYSTEM_URL")
    if not url:
        url = "http://100.70.67.36:8000/api/deliveries"

    delivery_record = getattr(transaction, "delivery_record", None)
    if not delivery_record:
        return

    payload = {
        "saleTransactionId": f"TXN-{transaction.id}",
        "customerName": transaction.customer_name,
        "itemDescription": getattr(delivery_record, "item_description", "Leather Items") or "Leather Items",
        "quantity": int(getattr(delivery_record, "quantity", 0)),
        "deliveryType": "Outbound",
        "scheduledDate": delivery_record.scheduled_at.date().isoformat() if delivery_record.scheduled_at else None,
        "deliveryAddress": getattr(delivery_record, "delivery_address", ""),
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=3.0) as response:
            if response.status in {200, 201}:
                print("Successfully pushed to Mary Ann's Delivery Subsystem!")
    except urllib.error.HTTPError as e:
        # Read and print the actual validation/errors returned by the Delivery subsystem
        try:
            error_body = e.read().decode('utf-8')
        except Exception:
            error_body = str(e)
        print(f"Failed to push to Delivery subsystem (HTTP {getattr(e, 'code', 'N/A')}): {error_body}")
    except Exception as e:
        print(f"Failed to push to Delivery subsystem: {e}")


# NOTE: Stock deduction is fully handled inside serializers.py → adjust_inventory().
# There is NO deduct_inventory_stock function here intentionally —
# having it here AND in serializers.py would cause double-deduction on every transaction.


from .models import DeliveryType, LeatherType, SizeType, Transaction, DeliveryRecord
from .serializers import (
    LeatherTypeSerializer, SizeTypeSerializer, DeliveryTypeSerializer,
    TransactionSerializer, DeliveryRecordSerializer, DeliveryPushSerializer,
    UserSerializer,
    get_inventory_qty, adjust_inventory,
)


class LeatherTypeViewSet(viewsets.ModelViewSet):
    queryset         = LeatherType.objects.all()
    serializer_class = LeatherTypeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends  = [SearchFilter, OrderingFilter]
    search_fields    = ["name", "tag"]
    ordering_fields  = ["name", "created_at"]


class SizeTypeViewSet(viewsets.ModelViewSet):
    queryset         = SizeType.objects.all()
    serializer_class = SizeTypeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends  = [SearchFilter, OrderingFilter]
    search_fields    = ["name"]
    ordering_fields  = ["name", "created_at"]


class DeliveryTypeViewSet(viewsets.ModelViewSet):
    serializer_class = DeliveryTypeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends  = [SearchFilter, OrderingFilter]
    search_fields    = ["name"]
    ordering_fields  = ["name", "created_at"]

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [IsAuthenticated(), IsAdminUser()]
        return [IsAuthenticated()]

    def get_queryset(self):
        # Never return soft-deleted delivery types to the frontend
        return DeliveryType.objects.filter(is_deleted=0)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = 1
        instance.deleted_at = timezone.now()
        instance.save()
        return Response(
            {"detail": f"Delivery type '{instance.name}' deleted."},
            status=status.HTTP_200_OK,
        )


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only — users are managed outside this subsystem for now.
    GET  /api/users/
    GET  /api/users/{id}/
    """
    permission_classes = [IsAuthenticated]
    queryset         = User.objects.all()
    serializer_class = UserSerializer


class DeliveryRecordViewSet(viewsets.ModelViewSet):
    serializer_class = DeliveryRecordSerializer
    permission_classes = [IsAuthenticated]
    filter_backends  = [SearchFilter, OrderingFilter]
    search_fields    = ["transaction__id", "customer_name", "delivery_type_snapshot"]
    ordering_fields  = ["scheduled_at", "created_at", "status"]

    def get_queryset(self):
        return DeliveryRecord.objects.select_related("transaction").all()


class DeliveryPushAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = DeliveryPushSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        delivery_record = serializer.save()
        status_code = status.HTTP_201_CREATED if delivery_record._state.adding else status.HTTP_200_OK
        return Response({"detail": "Delivery pushed successfully."}, status=status_code)


class InventoryStockAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        item = request.query_params.get("item")
        unit = request.query_params.get("unit")
        if not item:
            return Response({"detail": "Missing 'item' parameter."}, status=status.HTTP_400_BAD_REQUEST)
        qty = get_inventory_qty(item, unit=unit)
        if qty is None:
            return Response({"detail": "Could not contact inventory system."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response({"available": qty}, status=status.HTTP_200_OK)


class InventoryAdjustAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        item = request.data.get("item")
        delta = request.data.get("delta")
        unit = request.data.get("unit")
        if item is None or delta is None:
            return Response({"detail": "Require 'item' and 'delta' in body."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            delta = int(delta)
        except (TypeError, ValueError):
            return Response({"detail": "Invalid 'delta' value."}, status=status.HTTP_400_BAD_REQUEST)
        ok = adjust_inventory(item, delta, unit=unit)
        if not ok:
            return Response({"detail": "Failed to adjust inventory."}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({"detail": "Inventory adjusted."}, status=status.HTTP_200_OK)


class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends  = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "leather_type", "size_type", "delivery_type", "encoded_by"]
    search_fields    = ["id", "customer_name", "leather_name_snapshot"]
    ordering_fields  = ["created_at", "total_amount", "status"]

    def get_queryset(self):
        # Never return soft-deleted transactions to the frontend
        return Transaction.objects.select_related(
            "leather_type", "size_type", "encoded_by"
        ).filter(is_deleted=0)

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), CanCreateTransaction()]
        if self.action in {"update", "partial_update"}:
            return [IsAuthenticated(), CanEditTransaction()]
        if self.action == "destroy":
            return [IsAuthenticated(), CanDeleteTransaction()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        # serializer.save() handles everything:
        #   1. Creates the Transaction
        #   2. Creates the DeliveryRecord
        #   3. Pushes to delivery subsystem
        #   4. Deducts stock from inventory subsystem
        # Do NOT add any inventory deduction here — it would double-deduct.
        transaction = serializer.save()

        # Push to Mary Ann's Delivery Subsystem (if not pick-up)
        # This is a secondary push from views as a safety net.
        # serializers.py already does this via send_delivery_to_external_system(),
        # so this call is intentionally guarded to avoid double-push.
        # Uncomment ONLY if serializer is not handling delivery push:
        # if not getattr(transaction, 'is_pickup', False):
        #     push_to_delivery_system(transaction)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # Soft delete — sets is_deleted=1 and records the timestamp
        instance.is_deleted = 1
        instance.deleted_at = timezone.now()
        instance.save()
        return Response(
            {"detail": f"Transaction {instance.id} deleted."},
            status=status.HTTP_200_OK,
        )