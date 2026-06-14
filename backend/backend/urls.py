from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from sales.views import LeatherTypeViewSet, SizeTypeViewSet, TransactionViewSet, DeliveryPushAPIView

router = DefaultRouter()
router.register(r"leather-types",  LeatherTypeViewSet,  basename="leather-types")
router.register(r"size-types",     SizeTypeViewSet,     basename="size-types")
router.register(r"transactions",   TransactionViewSet,  basename="transactions")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("authentication.urls")),
    path("api/", include(router.urls)),
    path("api/deliveries/", DeliveryPushAPIView.as_view(), name="delivery-push"),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# ─── Registered endpoints ────────────────────────────────────────────────────
#  GET/POST   → /api/leather-types/
#  GET/PUT/PATCH/DELETE → /api/leather-types/{id}/
#
#  GET/POST   → /api/size-types/
#  GET/PUT/PATCH/DELETE → /api/size-types/{id}/
#
#  GET/POST   → /api/transactions/
#  GET/PUT/PATCH/DELETE → /api/transactions/{id}/