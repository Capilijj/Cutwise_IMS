from rest_framework import serializers
from .models import LeatherType, SizeType, Transaction, User


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


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ["id", "name", "initials", "role", "created_at"]
        read_only_fields = ["id", "created_at"]


class TransactionSerializer(serializers.ModelSerializer):
    # id is a CharField PK — not required on create (auto-generated)
    id = serializers.CharField(required=False)

    # Encoder info — read-only nested object in responses
    encoded_by = UserSerializer(read_only=True)

    # Accept quantity or quantity_kg from frontend
    quantity = serializers.IntegerField(required=False, write_only=True)

    # Accept price or unit_price from frontend
    price = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, write_only=True
    )

    # Snapshots are auto-filled — never required from frontend
    leather_name_snapshot = serializers.CharField(required=False)
    size_snapshot         = serializers.CharField(required=False)

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
            "leather_type", "leather_name_snapshot",
            "size_type",    "size_snapshot",
            "quantity_kg",  "unit_price",  "total_amount",
            "quantity",     "price",
            "status",       "created_at",
        ]
        # total_amount is a PostgreSQL GENERATED column — always read-only
        read_only_fields = ["total_amount", "created_at"]

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

    def validate(self, attrs):
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

        # 3. Require quantity_kg and unit_price
        if not attrs.get("quantity_kg"):
            raise serializers.ValidationError({"quantity_kg": "Quantity is required."})
        if not attrs.get("unit_price"):
            raise serializers.ValidationError({"unit_price": "Unit price is required."})

        # 4. Auto-fill leather_name_snapshot
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

        # 6. Auto-generate transaction ID
        if not self.instance and not attrs.get("id"):
            from .models import Transaction as Txn
            count = Txn.objects.count()
            attrs["id"] = f"TXN-2026-{str(count + 1).zfill(3)}"

        return attrs

    def create(self, validated_data):
        # Remove total_amount — PostgreSQL generates it automatically
        validated_data.pop("total_amount", None)

        # Hardcode encoded_by = User id=1 (Capili Justine) for now
        # TODO: Replace with request.user when auth system is integrated
        try:
            validated_data["encoded_by"] = User.objects.get(id=1)
        except User.DoesNotExist:
            validated_data["encoded_by"] = None

        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("total_amount", None)
        return super().update(instance, validated_data)