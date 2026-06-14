from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LeatherTypeViewSet, SizeTypeViewSet, DeliveryTypeViewSet,
    DeliveryRecordViewSet, UserViewSet, TransactionViewSet,
    InventoryStockAPIView, InventoryAdjustAPIView,
    DeliveryPushAPIView,
)

router = DefaultRouter()
router.register(r'leather-types',   LeatherTypeViewSet, basename='leather_type')
router.register(r'size-types',      SizeTypeViewSet, basename='size_type')
router.register(r'delivery-types',  DeliveryTypeViewSet, basename='delivery_type')
router.register(r'users',           UserViewSet, basename='user')
router.register(r'delivery-records', DeliveryRecordViewSet, basename='delivery_record')
router.register(r'transactions',    TransactionViewSet, basename='transaction')

urlpatterns = [
    path('', include(router.urls)),
    path('deliveries/', DeliveryPushAPIView.as_view()),
    path('inventory/stock/', InventoryStockAPIView.as_view()),
    path('inventory/adjust/', InventoryAdjustAPIView.as_view()),
]