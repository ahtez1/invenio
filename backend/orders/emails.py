import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def send_order_confirmation(order):
    lines = [f"Thanks for your order #{order.id}!", ""]
    for item in order.items.all():
        lines.append(f"  {item.quantity} x {item.ticket_type} - {item.event_title} (${item.unit_price} each)")
    lines += ["", f"Total: ${order.total}"]

    try:
        send_mail(
            subject=f"Inveni order #{order.id} confirmed",
            message="\n".join(lines),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[order.user.email],
            fail_silently=False,
        )
    except Exception:
        logger.exception("Failed to send order confirmation email for order %s", order.id)
