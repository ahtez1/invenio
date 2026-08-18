from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class Cart(models.Model):
    """One cart per user - there's no anonymous, client-supplied cart ID
    anywhere in this app. Every cart lookup goes through request.user."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="cart"
    )
    created_at = models.DateTimeField(auto_now_add=True)


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    ticket = models.ForeignKey(
        "events.Ticket", on_delete=models.CASCADE, related_name="cart_items"
    )
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])

    class Meta:
        unique_together = [["cart", "ticket"]]


class Order(models.Model):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    CANCELLED = "cancelled"
    STATUS_CHOICES = [
        (PENDING, "Pending"),
        (PAID, "Paid"),
        (FAILED, "Failed"),
        (CANCELLED, "Cancelled"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="orders"
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=PENDING)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True, default="")
    placed_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-placed_at"]

    def __str__(self):
        return f"Order #{self.id} ({self.status})"


class OrderItem(models.Model):
    """Snapshots event title / ticket type / price at purchase time so an
    organizer editing a ticket later never rewrites history."""

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    ticket = models.ForeignKey(
        "events.Ticket", on_delete=models.SET_NULL, null=True, related_name="order_items"
    )
    event_title = models.CharField(max_length=200)
    ticket_type = models.CharField(max_length=10)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()

    @property
    def line_total(self):
        return self.unit_price * self.quantity
