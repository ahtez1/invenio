from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet, ReadOnlyModelViewSet
from rest_framework.mixins import (
    CreateModelMixin,
    DestroyModelMixin,
    ListModelMixin,
    UpdateModelMixin,
)

from .emails import send_order_confirmation
from .models import Cart, CartItem, Order
from .payment_client import get_payment_client
from .serializers import (
    AddCartItemSerializer,
    CartItemSerializer,
    CartSerializer,
    OrderSerializer,
    UpdateCartItemSerializer,
)
from .services import create_order_from_cart


def get_or_create_cart(user):
    cart, _ = Cart.objects.get_or_create(user=user)
    return cart


class CartView(APIView):
    """The caller's own cart - there is no cart ID in this URL at all, so
    a user can never address another user's cart."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        cart = get_or_create_cart(request.user)
        return Response(CartSerializer(cart).data)


class CartItemViewSet(
    CreateModelMixin, ListModelMixin, UpdateModelMixin, DestroyModelMixin, GenericViewSet
):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CartItem.objects.filter(cart__user=self.request.user).select_related(
            "ticket", "ticket__event"
        )

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AddCartItemSerializer
        if self.request.method in ("PUT", "PATCH"):
            return UpdateCartItemSerializer
        return CartItemSerializer

    def get_serializer_context(self):
        return {"cart": get_or_create_cart(self.request.user), **super().get_serializer_context()}

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = serializer.save()
        return Response(CartItemSerializer(item).data, status=status.HTTP_201_CREATED)


class OrderViewSet(ReadOnlyModelViewSet):
    serializer_class = OrderSerializer

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        base = Order.objects.prefetch_related("items__ticket__event")
        if user.is_staff:
            return base.all()
        return base.filter(user=user)

    @action(detail=False, methods=["post"])
    def checkout(self, request):
        order = create_order_from_cart(request.user)
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def pay(self, request, pk=None):
        order = self.get_object()
        if order.status == Order.PAID:
            return Response(OrderSerializer(order).data)
        if order.status != Order.PENDING:
            return Response({"error": f"Order is {order.status}."}, status=status.HTTP_400_BAD_REQUEST)

        client = get_payment_client()
        result = client.create_payment_intent(order)

        if result["mode"] == "fake":
            order.status = Order.PAID
            order.paid_at = timezone.now()
            order.save(update_fields=["status", "paid_at"])
            send_order_confirmation(order)
            return Response({"mode": "fake", "order": OrderSerializer(order).data})

        order.stripe_payment_intent_id = result["intent_id"]
        order.save(update_fields=["stripe_payment_intent_id"])
        return Response({"mode": "live", "client_secret": result["client_secret"]})


class StripeWebhookView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        client = get_payment_client()
        if client.mode != "live":
            return Response(status=status.HTTP_404_NOT_FOUND)

        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")
        try:
            event = client.construct_webhook_event(request.body, sig_header)
        except Exception:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        if event["type"] == "payment_intent.succeeded":
            intent = event["data"]["object"]
            order_id = intent.get("metadata", {}).get("order_id")
            try:
                order = Order.objects.get(pk=order_id)
            except (Order.DoesNotExist, TypeError, ValueError):
                return Response(status=status.HTTP_200_OK)
            if order.status != Order.PAID:
                order.status = Order.PAID
                order.paid_at = timezone.now()
                order.save(update_fields=["status", "paid_at"])
                send_order_confirmation(order)

        return Response(status=status.HTTP_200_OK)
