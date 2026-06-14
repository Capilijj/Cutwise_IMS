import json
import logging
import os
import urllib.error
import urllib.request
import urllib.parse
from datetime import datetime

from django.contrib.auth import get_user_model
from django.conf import settings
from django.utils.dateparse import parse_datetime
from rest_framework import serializers

from .models import DeliveryType, LeatherType, SizeType, Transaction, DeliveryRecord

logger = logging.getLogger(__name__)
User = get_user_model()


def get_inventory_qty(item, unit=None):
    """Query external inventory system for total available quantity of `item`.
    Sums ALL rows matching material_name (same material may exist across multiple suppliers).
    Handles paginated responses: {"count": N, "results": [...]} or plain list.
    Returns the total stock quantity or None if unavailable.
    """
    base = getattr(settings, "INVENTORY_API_URL", None) or os.environ.get("INVENTORY_API_URL")
    if not base:
        return None

    # Build correct materials URL — avoid double /materials/materials/
    stripped = base.rstrip('/')
    if stripped.endswith('/materials'):
        materials_url = f"{stripped}/"
    else:
        materials_url = f"{stripped}/materials/"

    print("--- FETCHING MATERIALS FROM INVENTORY ---:", materials_url)
    req = urllib.request.Request(materials_url, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode('utf-8'))

                # Handle both paginated {"count":N,"results":[...]} and plain list
                if isinstance(data, dict):
                    materials_list = data.get('results', [])
                elif isinstance(data, list):
                    materials_list = data
                else:
                    materials_list = []

                # SUM all rows matching material_name — same leather may exist
                # across multiple suppliers (e.g. Italian Goatskin has 3 rows)
                item_lower = item.strip().lower()
                total_qty = 0
                matched = 0
                for m in materials_list:
                    mat_name = (m.get('material_name') or m.get('name') or '').strip().lower()
                    if mat_name == item_lower:
                        total_qty += int(m.get('quantity') or 0)
                        matched += 1

                if matched > 0:
                    print(f"DEBUG: Found '{item}' in {matched} row(s) — total quantity={total_qty}")
                    return total_qty

                print(f"DEBUG: Material '{item}' not found in Inventory (checked {len(materials_list)} items).")
                return 0
    except Exception as exc:
        import traceback
        print("--- INVENTORY CONNECTION ERROR ---:", type(exc).__name__, str(exc))
        traceback.print_exc()
        return None


def get_inventory_materials(item: str):
    """Fetch ALL material rows from the external inventory system whose
    `material_name` matches `item` (case-insensitive).

    Returns a list of dicts (each containing at least 'id' and 'quantity'),
    sorted by quantity descending (largest stock first) — used so deductions
    drain the biggest pile first when a material is spread across multiple
    supplier rows. Returns None if the inventory system is unreachable.
    """
    base = getattr(settings, "INVENTORY_API_URL", None) or os.environ.get("INVENTORY_API_URL")
    if not base:
        return None

    stripped = base.rstrip('/')
    if stripped.endswith('/materials'):
        materials_url = f"{stripped}/"
    else:
        materials_url = f"{stripped}/materials/"

    req = urllib.request.Request(materials_url, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode('utf-8'))

                if isinstance(data, dict):
                    materials_list = data.get('results', [])
                elif isinstance(data, list):
                    materials_list = data
                else:
                    materials_list = []

                item_lower = item.strip().lower()
                matches = [
                    m for m in materials_list
                    if (m.get('material_name') or m.get('name') or '').strip().lower() == item_lower
                ]
                matches.sort(key=lambda m: int(m.get('quantity') or 0), reverse=True)
                return matches
    except Exception as exc:
        import traceback
        print("--- INVENTORY MATERIALS FETCH ERROR ---:", type(exc).__name__, str(exc))
        traceback.print_exc()
        return None

    return []


def deduct_inventory(material_name: str, quantity: int):
    """Deduct `quantity` units of `material_name` from the external inventory
    system using its `/materials/{id}/deduct/` endpoint.

    If the material is spread across multiple rows (e.g. same leather from
    different suppliers), drains the row with the most stock first, then
    moves to the next row if more is still needed, until the full `quantity`
    has been deducted (or stock runs out).

    Returns True if the *entire* requested quantity was successfully
    deducted, False otherwise.
    """
    if quantity is None or quantity <= 0:
        return True

    base = getattr(settings, "INVENTORY_API_URL", None) or os.environ.get("INVENTORY_API_URL")
    if not base:
        print("--- INVENTORY DEDUCT SKIPPED: INVENTORY_API_URL not configured ---")
        return False

    matches = get_inventory_materials(material_name)
    if matches is None:
        print(f"--- INVENTORY DEDUCT SKIPPED: could not reach inventory system for '{material_name}' ---")
        return False
    if not matches:
        print(f"--- INVENTORY DEDUCT SKIPPED: no rows found for '{material_name}' ---")
        return False

    headers = {"Content-Type": "application/json"}
    auth_header = getattr(settings, "INVENTORY_API_AUTHORIZATION", None) or os.environ.get("INVENTORY_API_AUTHORIZATION")
    if auth_header:
        headers["Authorization"] = auth_header

    remaining = quantity
    for m in matches:
        if remaining <= 0:
            break

        available = int(m.get('quantity') or 0)
        if available <= 0:
            continue

        take = min(available, remaining)
        material_id = m.get('id')
        url = f"{base.rstrip('/')}/materials/{material_id}/deduct/"
        payload = {"quantity": take}
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")

        print("--- CALLING INVENTORY DEDUCT URL ---:", url, "payload=", payload)
        try:
            with urllib.request.urlopen(req, timeout=8) as resp:
                if resp.status < 400:
                    body = json.loads(resp.read().decode('utf-8'))
                    print("--- INVENTORY DEDUCT RESPONSE ---:", body)
                    remaining -= take
                else:
                    print(f"--- INVENTORY DEDUCT FAILED (status={resp.status}) for material {material_id} ---")
        except Exception as exc:
            import traceback
            print("--- INVENTORY DEDUCT ERROR ---:", type(exc).__name__, str(exc))
            traceback.print_exc()
            logger.warning("Could not deduct %s units of '%s' (material id=%s): %s", take, material_name, material_id, exc)

    if remaining > 0:
        logger.warning(
            "Only deducted %s of %s requested units for '%s' (insufficient stock or partial failures).",
            quantity - remaining, quantity, material_name,
        )
        return False

    return True


def adjust_inventory(leather_name: str, delta: int, unit: str = None):
    """Adjust inventory by POSTing to the external inventory system.
    Expects `POST /adjust` with JSON {"item": <name>, "delta": <int>, "unit": <unit>}.
    Returns True on success, False otherwise.
    """
    base = getattr(settings, "INVENTORY_API_URL", None) or os.environ.get("INVENTORY_API_URL")
    if not base:
        return False
    url = f"{base.rstrip('/')}/adjust"
    payload = {"item": leather_name, "delta": delta}
    if unit:
        payload["unit"] = unit
    data = json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    auth_header = getattr(settings, "INVENTORY_API_AUTHORIZATION", None) or os.environ.get("INVENTORY_API_AUTHORIZATION")
    if auth_header:
        headers["Authorization"] = auth_header
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    # Debug print: show exact URL being called for adjustments
    print("--- CALLING INVENTORY ADJUST URL ---:", url, "payload=", payload)
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            return resp.status < 400
    except Exception as exc:
        import traceback
        print("--- INVENTORY ADJUST ERROR ---:", type(exc).__name__, str(exc))
        traceback.print_exc()
        logger.warning("Could not adjust inventory for %s by %s: %s", leather_name, delta, exc)
        return False


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
        delivery_record = getattr(instance, "delivery_record", None)
        data["is_pickup"] = self.get_is_pickup(instance)
        data["item_description"] = getattr(delivery_record, "item_description", "") or ""
        data["delivery_address"] = getattr(delivery_record, "delivery_address", "") or ""
        return data

    def validate(self, attrs):
        # 0. Accept alternate schedule field names and normalize to scheduled_at.
        if "scheduledAt" in attrs and "scheduled_at" not in attrs:
            attrs["scheduled_at"] = attrs.pop("scheduledAt")
        if "scheduledDate" in attrs and "scheduled_at" not in attrs:
            attrs["scheduled_at"] = attrs.pop("scheduledDate")
        if attrs.get("scheduled_at") == "":
            attrs.pop("scheduled_at", None)

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

        # 6. Validate inventory availability for the requested leather
        requested_qty = attrs.get("quantity_kg")
        if leather and requested_qty is not None:
            size = attrs.get("size_type")
            size_unit = getattr(size, "unit", None)
            if size_unit == "sqft":
                size_unit = "sqr"
            if size_unit is None:
                size_unit = "sqr"
            available = get_inventory_qty(leather.name, unit=size_unit)
            # If inventory system can't be contacted with the `name`, try the
            # leather `tag` as some external systems index materials by tag.
            if available is None:
                try:
                    tag = getattr(leather, 'tag', None)
                    if tag:
                        available = get_inventory_qty(tag, unit=size_unit)
                except Exception:
                    logger.exception('Error while retrying inventory lookup with tag for %s', leather.name)
            if available is None:
                raise serializers.ValidationError({"leather_type": "Could not verify inventory availability for the selected leather."})
            if available == 0:
                raise serializers.ValidationError({"leather_type": f"{leather.name} is out of stock."})
            if requested_qty > available:
                raise serializers.ValidationError({"quantity_kg": f"Requested quantity ({requested_qty}) exceeds available stock ({available})."})

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
        pushed = False
        if delivery_record:
            pushed = self.send_delivery_to_external_system(delivery_record)

        # Decrement inventory whenever a transaction is created, even if the
        # delivery push did not succeed. This keeps the external stock count
        # (Sub1's Inventory subsystem) aligned with the record creation.
        #
        # Sub1 exposes POST /materials/{id}/deduct/ with {"quantity": N} —
        # there is no generic /adjust endpoint, so we look up the matching
        # material row(s) by name first, then deduct from them (largest
        # stock first if the same leather is split across suppliers).
        try:
            if transaction.leather_name_snapshot:
                success = deduct_inventory(
                    transaction.leather_name_snapshot,
                    int(transaction.quantity_kg),
                )
                if not success:
                    logger.warning("Failed to fully deduct inventory for %s after creating transaction %s", transaction.leather_name_snapshot, transaction.id)
        except Exception:
            logger.exception("Error while attempting to deduct inventory for transaction %s", transaction.id)

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
        # Prefer `DELIVERY_API_URL` name; fall back to `DELIVERY_SYSTEM_URL` for compatibility
        url = getattr(settings, "DELIVERY_API_URL", None) or os.environ.get("DELIVERY_API_URL")
        if not url:
            url = getattr(settings, "DELIVERY_SYSTEM_URL", None) or os.environ.get("DELIVERY_SYSTEM_URL")
        if not url:
            return False

        # Map Sales choices to Delivery subsystem choices
        delivery_type = delivery_record.delivery_type_snapshot
        if delivery_type in ["Delivery", "delivery", "Outbound", "outbound"]:
            delivery_type = "Outbound"
        elif delivery_type in ["Pick Up", "pickup", "Customer Pickup", "Customer Pick-up"]:
            delivery_type = "Customer Pickup"
        else:
            delivery_type = "Third-Party Courier"

        payload = {
            "saleTransactionId": f"TXN-{delivery_record.transaction_id}",
            "customerName": delivery_record.customer_name,
            "itemDescription": delivery_record.item_description,
            "quantity": delivery_record.quantity,
            "deliveryAddress": delivery_record.delivery_address,
            "scheduledDate": delivery_record.scheduled_at.date().isoformat() if delivery_record.scheduled_at else None,
            "deliveryType": delivery_type,
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
                    return False
                print("Successfully pushed delivery record to Delivery subsystem!")
                return True
        except urllib.error.HTTPError as e:
            try:
                error_body = e.read().decode('utf-8')
            except Exception:
                error_body = str(e)
            logger.warning("Failed to push to Delivery subsystem (HTTP %s): %s", getattr(e, 'code', 'N/A'), error_body)
            return False
        except urllib.error.URLError as exc:
            logger.warning("Could not push delivery to external system: %s", exc)
            return False
    def update(self, instance, validated_data):
        validated_data.pop("total_amount", None)
        item_description = validated_data.pop("item_description", None)
        delivery_address = validated_data.pop("delivery_address", None)

        transaction = super().update(instance, validated_data)

        existing_item_description = ""
        existing_delivery_address = ""
        if hasattr(transaction, "delivery_record") and transaction.delivery_record is not None:
            existing_item_description = transaction.delivery_record.item_description or ""
            existing_delivery_address = transaction.delivery_record.delivery_address or ""

        DeliveryRecord.objects.update_or_create(
            transaction=transaction,
            defaults={
                "customer_name": transaction.customer_name,
                "item_description": item_description if item_description is not None else (existing_item_description or f"{transaction.leather_name_snapshot} / {transaction.size_snapshot}"),
                "delivery_address": delivery_address if delivery_address is not None else existing_delivery_address,
                "delivery_type_snapshot": transaction.delivery_type_snapshot,
                "scheduled_at": transaction.scheduled_at,
                "is_pickup": transaction.is_pickup,
                "status": "Ready for Pickup" if transaction.is_pickup else "Pending",
            },
        )

        return transaction