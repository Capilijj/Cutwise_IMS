from django.conf import settings
from django.db import models
from django.utils.crypto import get_random_string


def generate_delivery_id():
    return f"DEL-S0-{get_random_string(4, allowed_chars='0123456789')}"


class LeatherType(models.Model):
    name       = models.CharField(max_length=100, unique=True)
    tag        = models.CharField(max_length=50, blank=True, null=True)
    photo_url  = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "leather_types"
        ordering = ["name"]

    def __str__(self):
        return self.name


class SizeType(models.Model):
    name       = models.CharField(max_length=100)
    value      = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    unit       = models.CharField(max_length=10, default="sqr")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "size_types"
        ordering = ["name"]

    def __str__(self):
        return self.name


class DeliveryType(models.Model):
    name       = models.CharField(max_length=100, unique=True)
    is_deleted = models.SmallIntegerField(default=0)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "delivery_types"
        ordering = ["name"]

    def __str__(self):
        return self.name


class DeliveryRecord(models.Model):
    STATUS_CHOICES = [
        ("Pending", "Pending"),
        ("Ready for Pickup", "Ready for Pickup"),
        ("In Transit", "In Transit"),
        ("Delivered", "Delivered"),
        ("Cancelled", "Cancelled"),
    ]

    transaction = models.OneToOneField(
        "Transaction",
        on_delete=models.CASCADE,
        related_name="delivery_record",
    )
    delivery_id            = models.CharField(max_length=16, unique=True, null=True, blank=True)
    customer_name          = models.CharField(max_length=150)
    item_description       = models.TextField(blank=True, default="")
    quantity               = models.PositiveIntegerField(default=0)
    delivery_address       = models.TextField(blank=True, default="")
    delivery_type_snapshot = models.CharField(max_length=50)
    scheduled_at           = models.DateTimeField(null=True, blank=True)
    is_pickup              = models.BooleanField(default=False)
    status                 = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Pending")
    created_at             = models.DateTimeField(auto_now_add=True)
    updated_at             = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "delivery_records"
        ordering = ["-scheduled_at", "-created_at"]

    def __str__(self):
        return f"Delivery {self.transaction.id} — {self.delivery_type_snapshot}"

    def save(self, *args, **kwargs):
        if not self.delivery_id:
            self.delivery_id = generate_delivery_id()
        super().save(*args, **kwargs)


class Transaction(models.Model):
    STATUS_CHOICES = [
        ("Pending",   "Pending"),
        ("Completed", "Completed"),
        ("Cancelled", "Cancelled"),
    ]

    id                    = models.CharField(max_length=20, primary_key=True)
    # Who encoded this transaction (cashier/admin) — FK to users table
    encoded_by            = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="user_id",
        related_name="transactions",
    )
    customer_name         = models.CharField(max_length=150)
    leather_type          = models.ForeignKey(
        LeatherType, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="transactions"
    )
    leather_name_snapshot = models.CharField(max_length=100)
    size_type             = models.ForeignKey(
        SizeType, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="transactions"
    )
    size_snapshot         = models.CharField(max_length=50)
    delivery_type         = models.ForeignKey(
        DeliveryType, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="transactions"
    )
    delivery_type_snapshot = models.CharField(max_length=50, default="")
    scheduled_at           = models.DateTimeField(null=True, blank=True)
    is_pickup              = models.BooleanField(default=False)
    quantity_kg           = models.PositiveIntegerField()
    unit_price            = models.DecimalField(max_digits=12, decimal_places=2)
    # total_amount is GENERATED ALWAYS in PostgreSQL — Django must never write to it
    total_amount          = models.GeneratedField(
        expression=models.F("quantity_kg") * models.F("unit_price"),
        output_field=models.DecimalField(max_digits=14, decimal_places=2),
        db_persist=True,
    )
    status                = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="Pending"
    )
    # ── Soft delete ───────────────────────────────────────────
    is_deleted            = models.SmallIntegerField(default=0)
    deleted_at            = models.DateTimeField(null=True, blank=True)
    created_at            = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "transactions"
        ordering = ["-created_at"]

    def __str__(self):
        encoder = self.encoded_by.name if self.encoded_by else "Unknown"
        return f"{self.id} — {self.customer_name} (encoded by {encoder})"