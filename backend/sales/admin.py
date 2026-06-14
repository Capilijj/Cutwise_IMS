from django.contrib import admin
from .models import LeatherType, SizeType, DeliveryType, Transaction, DeliveryRecord


@admin.register(LeatherType)
class LeatherTypeAdmin(admin.ModelAdmin):
    list_display  = ["name", "tag", "created_at"]
    search_fields = ["name", "tag"]


@admin.register(SizeType)
class SizeTypeAdmin(admin.ModelAdmin):
    list_display  = ["name", "value", "unit", "created_at"]
    search_fields = ["name"]


@admin.register(DeliveryType)
class DeliveryTypeAdmin(admin.ModelAdmin):
    list_display  = ["name", "is_deleted", "deleted_at", "created_at"]
    search_fields = ["name"]
    list_filter   = ["is_deleted"]
    readonly_fields = ["deleted_at", "created_at"]


@admin.register(DeliveryRecord)
class DeliveryRecordAdmin(admin.ModelAdmin):
    list_display = [
        "id", "transaction", "customer_name", "delivery_type_snapshot",
        "scheduled_at", "is_pickup", "status", "created_at",
    ]
    search_fields = ["transaction__id", "customer_name", "delivery_type_snapshot"]
    ordering = ["-scheduled_at", "-created_at"]


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display  = [
        "id", "customer_name", "leather_name_snapshot", "size_snapshot",
        "delivery_type_snapshot", "quantity_kg", "unit_price",
        "total_amount", "status", "is_deleted", "created_at",
    ]
    list_filter   = ["status", "is_deleted", "leather_type", "size_type", "delivery_type"]
    search_fields = ["id", "customer_name", "leather_name_snapshot"]
    ordering      = ["-created_at"]
    readonly_fields = ["total_amount", "deleted_at", "created_at"]