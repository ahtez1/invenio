from decimal import Decimal

from django.db import transaction
from django.db.models import F
from rest_framework.exceptions import ValidationError

from events.models import Ticket

from .models import Order, OrderItem


@transaction.atomic
def create_order_from_cart(user):
    """Turns the user's cart into an Order, decrementing ticket stock
    atomically. Locks the relevant Ticket rows for the duration of the
    transaction so two concurrent checkouts can never oversell the same
    ticket tier."""
    cart = getattr(user, "cart", None)
    cart_items = list(cart.items.select_related("ticket", "ticket__event")) if cart else []
    if not cart_items:
        raise ValidationError("Your cart is empty.")

    ticket_ids = [item.ticket_id for item in cart_items]
    locked_tickets = {
        t.id: t for t in Ticket.objects.select_for_update().filter(id__in=ticket_ids)
    }

    for item in cart_items:
        ticket = locked_tickets[item.ticket_id]
        if ticket.quantity_available < item.quantity:
            raise ValidationError(
                f"Only {ticket.quantity_available} '{ticket.ticket_type}' ticket(s) left "
                f"for {ticket.event.title}."
            )

    order = Order.objects.create(user=user)
    total = Decimal("0")
    for item in cart_items:
        ticket = locked_tickets[item.ticket_id]
        Ticket.objects.filter(id=ticket.id).update(
            quantity_available=F("quantity_available") - item.quantity
        )
        OrderItem.objects.create(
            order=order,
            ticket=ticket,
            event_title=ticket.event.title,
            ticket_type=ticket.ticket_type,
            unit_price=ticket.price,
            quantity=item.quantity,
        )
        total += ticket.price * item.quantity

    order.total = total
    order.save(update_fields=["total"])
    cart.items.all().delete()
    return order
