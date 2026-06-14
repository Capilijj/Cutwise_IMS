import json
import logging
import os
import urllib.error
import urllib.request
from datetime import datetime

from django.contrib.auth import get_user_model
from django.conf import settings
from django.utils.dateparse import parse_datetime
from rest_framework import serializers

from .models import DeliveryType, LeatherType, SizeType, Transaction, DeliveryRecord

logger = logging.getLogger(__name__)
User = get_user_model()


class LeatherTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model  = LeatherType
        fields = ["id", "name", "tag", "photo_url", "created_at"]
        read_only_fields = ["id", "created_at"]


class SizeTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model  = SizeType
        fields = ["id", "name", "value", "unit", "created_at"]
        read_only_fields = ["id", "created_at"]


class DeliveryTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model  = DeliveryType
        fields = ["id", "name", "created_at"]
        read_only_fields = ["id", "created_at"]


class DeliveryRecordSerializer(serializers.ModelSerializer):
    transaction_id = serializers.CharField(source="transaction.id", read_only=True)

    class Meta:
        model = DeliveryRecord
        fields = [
            "id", "transaction_id", "delivery_id", "customer_name", "item_description",
            "quantity", "delivery_address", "delivery_type_snapshot",
            "scheduled_at", "is_pickup", "status", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "transaction_id", "created_at", "updated_at"]


class DeliveryPushSerializer(serializers.Serializer):
    saleTransactionId = serializers.CharField()
    customerName = serializers.CharField()
    itemDescription = serializers.CharField(required=False, allow_blank=True)
    quantity = serializers.IntegerField(required=False, min_value=0)
    deliveryType = serializers.CharField(required=False, allow_blank=True)
    scheduledDate = serializers.DateField(required=False)
    deliveryAddress = serializers.CharField(required=False, allow_blank=True)

    def validate_saleTransactionId(self, value):
        if not Transaction.objects.filter(id=value).exists():
            raise serializers.ValidationError("Transaction not found.")
        return value

    def create(self, validated_data):
        transaction = Transaction.objects.get(id=validated_data.pop("saleTransactionId"))
        defaults = {
            "customer_name": validated_data.get("customerName"),
            "item_description": validated_data.get("itemDescription", ""),
            "quantity": validated_data.get("quantity", 0),
            "delivery_address": validated_data.get("deliveryAddress", ""),
            "delivery_type_snapshot": validated_data.get("deliveryType", "Outbound"),
            "scheduled_at": validated_data.get("scheduledDate"),
            "is_pickup": False,
            "status": "Pending",
        }
        delivery_record, created = DeliveryRecord.objects.update_or_create(
            transaction=transaction,
            defaults=defaults,
        )
        return delivery_record


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "full_name"]
        read_only_fields = ["id", "username", "email", "first_name", "last_name"]

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class TransactionSerializer(serializers.ModelSerializer):
    # id is a CharField PK — not required on create (auto-generated)
    id = serializers.CharField(required=False)

    # Encoder info — read-only nested object in responses
    encoded_by = UserSerializer(read_only=True)

    # Frontend uses this flag to render Pick-up vs Delivery in history.
    is_pickup = serializers.BooleanField(required=False, write_only=True)

    # Accept quantity or quantity_kg from frontend
    quantity = serializers.IntegerField(required=False, write_only=True)

    # Accept price or unit_price from frontend
    price = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, write_only=True
    )

    # Accept extra delivery payload for the created delivery record
    item_description = serializers.CharField(required=False, write_only=True, allow_blank=True)
    delivery_address = serializers.CharField(required=False, write_only=True, allow_blank=True)

    # Snapshots are auto-filled — never required from frontend
    leather_name_snapshot  = serializers.CharField(required=False)
    size_snapshot          = serializers.CharField(required=False)
    delivery_type_snapshot = serializers.CharField(required=False)
    scheduled_at            = serializers.DateTimeField(required=False, allow_null=True)

    # quantity_kg and unit_price optional (may come as quantity/price)
    quantity_kg = serializers.IntegerField(required=False)
    unit_price  = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False
    )

    class Meta:
        model  = Transaction
        fields = [
            "id", "encoded_by",
            "customer_name",
            "leather_type",   "leather_name_snapshot",
            "size_type",      "size_snapshot",
            "delivery_type",  "delivery_type_snapshot",
            "scheduled_at",   "is_pickup",
            "quantity_kg",    "unit_price",  "total_amount",
            "quantity",       "price",
            "item_description", "delivery_address",
            "status",
            "is_deleted",     "deleted_at",
            "created_at",
        ]
        # total_amount is a PostgreSQL GENERATED column — always read-only
        # is_deleted and deleted_at are managed by the view, not the frontend
        read_only_fields = ["total_amount", "is_deleted", "deleted_at", "created_at"]

    def validate_quantity_kg(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0.")
        return value

    def validate_quantity(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0.")
        return value

    def validate_unit_price(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Unit price must be greater than 0.")
        return value

    def validate_price(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Price must be greater than 0.")
        return value

    def get_is_pickup(self, obj):
        snapshot = (obj.delivery_type_snapshot or "").strip().lower()
        return snapshot in {"pick up", "pickup", "pick-up"}

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["is_pickup"] = self.get_is_pickup(instance)
        return data

    def validate(self, attrs):
        # 0. Accept alternate schedule field names and normalize to scheduled_at.
        if "scheduledAt" in attrs and "scheduled_at" not in attrs:
            attrs["scheduled_at"] = attrs.pop("scheduledAt")
        if "scheduledDate" in attrs and "scheduled_at" not in attrs:
            attrs["scheduled_at"] = attrs.pop("scheduledDate")

        # 0. Accept alternate address field names.
        if "deliveryAddress" in attrs and "delivery_address" not in attrs:
            attrs["delivery_address"] = attrs.pop("deliveryAddress")

        # 1. Map quantity → quantity_kg
        if "quantity" in attrs and "quantity_kg" not in attrs:
            attrs["quantity_kg"] = attrs.pop("quantity")
        else:
            attrs.pop("quantity", None)

        # 2. Map price → unit_price
        if "price" in attrs and "unit_price" not in attrs:
            attrs["unit_price"] = attrs.pop("price")
        else:
            attrs.pop("price", None)

        # 3. On partial edits, keep the existing values if the client did not send them.
        if self.instance is not None:
            attrs.setdefault("quantity_kg", self.instance.quantity_kg)
            attrs.setdefault("unit_price", self.instance.unit_price)
            attrs.setdefault("scheduled_at", self.instance.scheduled_at)
            attrs.setdefault("is_pickup", self.instance.is_pickup)

        # 4. Require quantity_kg and unit_price only for creation.
        if self.instance is None and (attrs.get("quantity_kg") in (None, "") or attrs.get("unit_price") in (None, "")):
            if attrs.get("quantity_kg") in (None, ""):
                raise serializers.ValidationError({"quantity_kg": "Quantity is required."})
            if attrs.get("unit_price") in (None, ""):
                raise serializers.ValidationError({"unit_price": "Unit price is required."})

        # 5. Normalize schedule value if it comes as a localized string.
        scheduled = attrs.get("scheduled_at")
        if scheduled and isinstance(scheduled, str):
            parsed = parse_datetime(scheduled)
            if parsed is None:
                # Try common localized formats, including browser datetime-local values.
                for fmt in [
                    "%Y-%m-%dT%H:%M:%S",
                    "%Y-%m-%dT%H:%M",
                    "%Y-%m-%d %H:%M:%S",
                    "%Y-%m-%d %H:%M",
                    "%d/%m/%Y %I:%M %p",
                    "%d/%m/%Y %H:%M",
                ]:
                    try:
                        parsed = datetime.strptime(scheduled, fmt)
                        break
                    except ValueError:
                        continue
            if parsed is None:
                raise serializers.ValidationError({"scheduled_at": "Accepted schedule formats: YYYY-MM-DDTHH:MM or DD/MM/YYYY HH:MM AM/PM."})
            attrs["scheduled_at"] = parsed

        # 6. Require schedule for deliveries, but allow pickup without schedule.
        if self.instance is None and not attrs.get("is_pickup", False) and attrs.get("scheduled_at") in (None, ""):
            raise serializers.ValidationError({"scheduled_at": "Scheduled date/time is required for delivery orders."})

        # 7. Require address for deliveries.
        if self.instance is None and not attrs.get("is_pickup", False) and not attrs.get("delivery_address", "").strip():
            raise serializers.ValidationError({"delivery_address": "Delivery address is required for delivery orders."})

        # 5. Auto-fill leather_name_snapshot
        leather = attrs.get("leather_type")
        if leather:
            attrs["leather_name_snapshot"] = leather.name
        elif not attrs.get("leather_name_snapshot"):
            attrs["leather_name_snapshot"] = "Unknown"

        # 5. Auto-fill size_snapshot
        size = attrs.get("size_type")
        if size:
            attrs["size_snapshot"] = size.name
        elif not attrs.get("size_snapshot"):
            attrs["size_snapshot"] = "Unknown"

        # 6. Auto-fill delivery_type_snapshot without touching the delivery_types table
        pickup_flag = attrs.pop("is_pickup", None)
        if pickup_flag is not None:
            attrs["is_pickup"] = pickup_flag
            attrs["delivery_type_snapshot"] = "Pick Up" if pickup_flag else "Delivery"
        else:
            delivery = attrs.get("delivery_type")
            if delivery:
                attrs["delivery_type_snapshot"] = delivery.name
            elif not attrs.get("delivery_type_snapshot"):
                attrs["delivery_type_snapshot"] = ""

        # 7. Auto-generate transaction ID
        if not self.instance and not attrs.get("id"):
            from .models import Transaction as Txn
            from django.utils import timezone
            today = timezone.now().strftime("%Y%m%d")
            count = Txn.objects.count()
            attrs["id"] = f"TXN-{today}-{str(count + 1).zfill(3)}"

        return attrs

    def create(self, validated_data):
        # Keep delivery metadata aside for delivery record creation.
        self._item_description = validated_data.pop("item_description", "")
        self._delivery_address = validated_data.pop("delivery_address", "")

        # Remove total_amount — PostgreSQL generates it automatically
        validated_data.pop("total_amount", None)

        # Hardcode encoded_by = User id=1 (Capili Justine) for now
        # TODO: Replace with request.user when auth system is integrated
        try:
            validated_data["encoded_by"] = User.objects.get(id=1)
        except User.DoesNotExist:
            validated_data["encoded_by"] = None

        transaction = super().create(validated_data)
        delivery_record = self.create_delivery_record(transaction)
        if delivery_record:
            self.send_delivery_to_external_system(delivery_record)
        return transaction

    def create_delivery_record(self, transaction):
        if hasattr(transaction, "delivery_record"):
            return None

        item_description = self._item_description or f"{transaction.leather_name_snapshot} / {transaction.size_snapshot}"

        return DeliveryRecord.objects.create(
            transaction=transaction,
            customer_name=transaction.customer_name,
            item_description=item_description,
            quantity=transaction.quantity_kg,
            delivery_address=self._delivery_address,
            delivery_type_snapshot=transaction.delivery_type_snapshot,
            scheduled_at=transaction.scheduled_at,
            is_pickup=transaction.is_pickup,
            status="Ready for Pickup" if transaction.is_pickup else "Pending",
        )

    def send_delivery_to_external_system(self, delivery_record):
        url = getattr(settings, "DELIVERY_SYSTEM_URL", None) or os.environ.get("DELIVERY_SYSTEM_URL")
        if not url:
            return

        payload = {
            "deliveryId": delivery_record.delivery_id,
            "customerName": delivery_record.customer_name,
            "itemDescription": delivery_record.item_description,
            "quantity": delivery_record.quantity,
            "deliveryAddress": delivery_record.delivery_address,
            "scheduledDate": delivery_record.scheduled_at.isoformat() if delivery_record.scheduled_at else None,
            "deliveryType": delivery_record.delivery_type_snapshot,
        }

        headers = {"Content-Type": "application/json"}
        request = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=10) as response:
                if response.status >= 400:
                    logger.warning("Delivery system push failed with status %s", response.status)
        except urllib.error.URLError as exc:
            logger.warning("Could not push delivery to external system: %s", exc)

    def update(self, instance, validated_data):
        validated_data.pop("total_amount", None)
        return super().update(instance, validated_data)