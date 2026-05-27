from django.contrib import admin
from .models import LeatherType, SizeType, Transaction


@admin.register(LeatherType)
class LeatherTypeAdmin(admin.ModelAdmin):
    list_display  = ["name", "tag", "created_at"]
    search_fields = ["name", "tag"]


@admin.register(SizeType)
class SizeTypeAdmin(admin.ModelAdmin):
    list_display  = ["name", "value", "unit", "created_at"]
    search_fields = ["name"]


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display  = ["id", "customer_name", "leather_name_snapshot", "size_snapshot", "quantity_kg", "unit_price", "total_amount", "status", "created_at"]
    list_filter   = ["status", "leather_type", "size_type"]
    search_fields = ["id", "customer_name", "leather_name_snapshot"]
    ordering      = ["-created_at"]
    readonly_fields = ["total_amount", "created_at"]