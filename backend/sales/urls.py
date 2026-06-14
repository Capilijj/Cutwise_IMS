from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LeatherTypeViewSet, SizeTypeViewSet, DeliveryTypeViewSet,
    DeliveryRecordViewSet, UserViewSet, TransactionViewSet,
)

router = DefaultRouter()
router.register(r'leather_types',   LeatherTypeViewSet)
router.register(r'size_types',      SizeTypeViewSet)
router.register(r'delivery_types',  DeliveryTypeViewSet)
router.register(r'users',           UserViewSet)
router.register(r'delivery-records', DeliveryRecordViewSet)
router.register(r'transactions',    TransactionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]