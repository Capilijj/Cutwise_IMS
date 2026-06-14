from django.contrib.auth.models import Group
from rest_framework.permissions import BasePermission


class IsAdminUser(BasePermission):
    """Allow only authenticated admins or staff users."""

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        return user.is_staff or user.is_superuser or Group.objects.filter(name__iexact="admin", user=user).exists()


class CanCreateTransaction(BasePermission):
    """Allow authenticated users to create transactions."""

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        return bool(user and user.is_authenticated)


class CanEditTransaction(BasePermission):
    """Allow authenticated users to edit transactions."""

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        return bool(user and user.is_authenticated)


class CanDeleteTransaction(BasePermission):
    """Allow authenticated users to delete transactions."""

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        return bool(user and user.is_authenticated)
