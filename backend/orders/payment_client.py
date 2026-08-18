"""Dual-mode payment client: a Fake implementation that needs no signups
(so checkout works out of the box) and a Live Stripe implementation that
activates automatically the moment STRIPE_SECRET_KEY is set in .env - no
code changes needed either way."""

from django.conf import settings


class BasePaymentClient:
    mode = "fake"

    def create_payment_intent(self, order):
        raise NotImplementedError


class FakePaymentClient(BasePaymentClient):
    mode = "fake"

    def create_payment_intent(self, order):
        return {"mode": "fake", "client_secret": None, "intent_id": ""}


class LiveStripeClient(BasePaymentClient):
    mode = "live"

    def __init__(self):
        import stripe

        stripe.api_key = settings.STRIPE_SECRET_KEY
        self._stripe = stripe

    def create_payment_intent(self, order):
        intent = self._stripe.PaymentIntent.create(
            amount=int(order.total * 100),
            currency="usd",
            metadata={"order_id": str(order.id)},
        )
        return {"mode": "live", "client_secret": intent.client_secret, "intent_id": intent.id}

    def construct_webhook_event(self, payload, sig_header):
        return self._stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )


def get_payment_client():
    if settings.STRIPE_SECRET_KEY:
        return LiveStripeClient()
    return FakePaymentClient()
