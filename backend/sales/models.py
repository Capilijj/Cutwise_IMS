from django.db import models


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
    unit       = models.CharField(max_length=10, default="sqft")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "size_types"
        ordering = ["name"]

    def __str__(self):
        return self.name


class User(models.Model):
    ROLE_CHOICES = [
        ("cashier",       "Cashier"),
        ("administrator", "Administrator"),
    ]

    name       = models.CharField(max_length=100)
    initials   = models.CharField(max_length=5)
    role       = models.CharField(max_length=50, choices=ROLE_CHOICES, default="cashier")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "users"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.role})"


class Transaction(models.Model):
    STATUS_CHOICES = [
        ("Pending",   "Pending"),
        ("Completed", "Completed"),
        ("Cancelled", "Cancelled"),
    ]

    id                    = models.CharField(max_length=20, primary_key=True)
    # Who encoded this transaction (cashier/admin) — FK to users table
    encoded_by            = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        db_column="user_id",          # maps to existing user_id column in DB
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
    created_at            = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "transactions"
        ordering = ["-created_at"]

    def __str__(self):
        encoder = self.encoded_by.name if self.encoded_by else "Unknown"
        return f"{self.id} — {self.customer_name} (encoded by {encoder})"