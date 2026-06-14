from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import Group, User
from django.db import connection
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response


def get_user_role(user):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT role FROM auth_user WHERE id = %s", [user.id])
            row = cursor.fetchone()
            if row and row[0]:
                return str(row[0]).strip().lower()
    except Exception:
        pass
    if user.is_superuser or Group.objects.filter(name__iexact="admin", user=user).exists():
        return "admin"
    if Group.objects.filter(name__iexact="supervisor", user=user).exists():
        return "supervisor"
    return "sales_clerk"


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    username = (request.data.get("username") or "").strip()
    password = request.data.get("password") or ""
    role = (request.data.get("role") or "").strip().lower()

    if not username or not password:
        return Response({"detail": "Email/username and password are required."}, status=status.HTTP_400_BAD_REQUEST)

    user = None
    if "@" in username:
        try:
            user = User.objects.get(email=username)
            username = user.username
        except User.DoesNotExist:
            user = None

    user = authenticate(request, username=username, password=password) or user

    if user is None or not user.is_active:
        return Response({"detail": "Invalid username/email or password."}, status=status.HTTP_401_UNAUTHORIZED)

    login(request, user)

    if role in {"admin", "supervisor", "sales_clerk"}:
        try:
            with connection.cursor() as cursor:
                cursor.execute("UPDATE auth_user SET role = %s WHERE id = %s", [role, user.id])
        except Exception:
            pass

    csrf_token = get_token(request)
    response = Response({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": get_user_role(user),
        "full_name": user.get_full_name() or user.username,
    }, status=status.HTTP_200_OK)
    response.set_cookie("csrftoken", csrf_token, httponly=False, samesite="Lax", secure=False)
    return response


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def current_user(request):
    profile = getattr(request.user, "profile", None)
    return Response({
        "id": request.user.id,
        "username": request.user.username,
        "email": request.user.email,
        "first_name": request.user.first_name,
        "last_name": request.user.last_name,
        "role": get_user_role(request.user),
        "full_name": request.user.get_full_name() or request.user.username,
    }, status=status.HTTP_200_OK)


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def logout_view(request):
    logout(request)
    return Response({"detail": "Logged out."}, status=status.HTTP_200_OK)
