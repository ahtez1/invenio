from rest_framework import serializers

from events.models import Ticket

from .models import Cart, CartItem, Order, OrderItem


class SimpleTicketSerializer(serializers.ModelSerializer):
    event_id = serializers.IntegerField(source="event.id", read_only=True)
    event_title = serializers.CharField(source="event.title", read_only=True)

    class Meta:
        model = Ticket
        fields = ["id", "ticket_type", "price", "quantity_available", "event_id", "event_title"]


class CartItemSerializer(serializers.ModelSerializer):
    ticket = SimpleTicketSerializer(read_only=True)
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ["id", "ticket", "quantity", "line_total"]

    def get_line_total(self, item):
        return item.ticket.price * item.quantity


class AddCartItemSerializer(serializers.ModelSerializer):
    ticket_id = serializers.IntegerField()

    class Meta:
        model = CartItem
        fields = ["id", "ticket_id", "quantity"]

    def validate_ticket_id(self, value):
        if not Ticket.objects.filter(pk=value).exists():
            raise serializers.ValidationError("No ticket with the given ID was found.")
        return value

    def save(self, **kwargs):
        cart = self.context["cart"]
        ticket_id = self.validated_data["ticket_id"]
        quantity = self.validated_data["quantity"]
        try:
            item = CartItem.objects.get(cart=cart, ticket_id=ticket_id)
            item.quantity += quantity
            item.save()
            self.instance = item
        except CartItem.DoesNotExist:
            self.instance = CartItem.objects.create(cart=cart, ticket_id=ticket_id, quantity=quantity)
        return self.instance


class UpdateCartItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CartItem
        fields = ["quantity"]


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_price = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ["id", "items", "total_price"]

    def get_total_price(self, cart):
        return sum((item.ticket.price * item.quantity for item in cart.items.all()), start=0)


class OrderItemSerializer(serializers.ModelSerializer):
    event_id = serializers.SerializerMethodField()
    event_date = serializers.SerializerMethodField()
    event_time = serializers.SerializerMethodField()
    event_location = serializers.SerializerMethodField()
    references = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "event_title",
            "ticket_type",
            "unit_price",
            "quantity",
            "event_id",
            "event_date",
            "event_time",
            "event_location",
            "references",
        ]

    def get_event_id(self, item):
        return item.ticket.event_id if item.ticket else None

    def get_event_date(self, item):
        return item.ticket.event.date if item.ticket else None

    def get_event_time(self, item):
        return item.ticket.event.time if item.ticket else None

    def get_event_location(self, item):
        return item.ticket.event.location if item.ticket else None

    def get_references(self, item):
        # Individual ticket tiers aren't separate DB rows - each unit within
        # a line item gets a stable, deterministic reference for entry/
        # display instead of a real per-seat record.
        return [f"INV-{item.order_id:06d}-{item.id}-{n + 1}" for n in range(item.quantity)]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ["id", "status", "total", "placed_at", "paid_at", "items"]
