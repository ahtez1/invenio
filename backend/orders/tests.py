from datetime import date, time
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from events.models import Event, Ticket

from .models import Cart, Order

User = get_user_model()


def make_user(email):
    return User.objects.create_user(email=email, username=email.split("@")[0], password="S0meStrongPass!")


def make_ticket(organizer, price="20.00", quantity=5):
    event = Event.objects.create(
        organizer=organizer,
        title="Show",
        description="desc",
        date=date(2026, 9, 1),
        time=time(19, 0),
        location="Nairobi",
    )
    return Ticket.objects.create(
        event=event, ticket_type="Regular", price=price, quantity_available=quantity
    )


class CartIsolationTests(APITestCase):
    def setUp(self):
        self.organizer = make_user("organizer@example.com")
        self.alice = make_user("alice@example.com")
        self.bob = make_user("bob@example.com")
        self.ticket = make_ticket(self.organizer)

    def test_cart_is_created_lazily_per_user(self):
        self.client.force_authenticate(self.alice)
        response = self.client.get("/api/orders/cart/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Cart.objects.filter(user=self.alice).count(), 1)

    def test_user_cannot_see_or_modify_another_users_cart_item(self):
        self.client.force_authenticate(self.alice)
        response = self.client.post(
            "/api/orders/cart-items/", {"ticket_id": self.ticket.id, "quantity": 2}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        item_id = response.data["id"]

        self.client.force_authenticate(self.bob)
        response = self.client.get("/api/orders/cart-items/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

        response = self.client.patch(f"/api/orders/cart-items/{item_id}/", {"quantity": 99})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        response = self.client.delete(f"/api/orders/cart-items/{item_id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class CheckoutStockTests(APITestCase):
    def setUp(self):
        self.organizer = make_user("organizer@example.com")
        self.alice = make_user("alice@example.com")
        self.bob = make_user("bob@example.com")
        self.ticket = make_ticket(self.organizer, price="20.00", quantity=3)

    def _add_to_cart(self, user, quantity):
        self.client.force_authenticate(user)
        return self.client.post(
            "/api/orders/cart-items/", {"ticket_id": self.ticket.id, "quantity": quantity}
        )

    def test_checkout_decrements_stock_exactly_once(self):
        self._add_to_cart(self.alice, 2)
        response = self.client.post("/api/orders/orders/checkout/")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.quantity_available, 1)
        self.assertEqual(response.data["total"], Decimal("40.00"))

    def test_checkout_rejects_overselling(self):
        self._add_to_cart(self.alice, 2)
        self.client.post("/api/orders/orders/checkout/")
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.quantity_available, 1)

        self._add_to_cart(self.bob, 5)
        response = self.client.post("/api/orders/orders/checkout/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.quantity_available, 1)

    def test_checkout_empty_cart_rejected(self):
        self.client.force_authenticate(self.alice)
        response = self.client.post("/api/orders/orders/checkout/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class OrderIsolationTests(APITestCase):
    def setUp(self):
        self.organizer = make_user("organizer@example.com")
        self.alice = make_user("alice@example.com")
        self.bob = make_user("bob@example.com")
        self.ticket = make_ticket(self.organizer)

    def test_user_cannot_see_or_pay_another_users_order(self):
        self.client.force_authenticate(self.alice)
        self.client.post("/api/orders/cart-items/", {"ticket_id": self.ticket.id, "quantity": 1})
        response = self.client.post("/api/orders/orders/checkout/")
        order_id = response.data["id"]

        self.client.force_authenticate(self.bob)
        response = self.client.get(f"/api/orders/orders/{order_id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        response = self.client.post(f"/api/orders/orders/{order_id}/pay/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_fake_mode_pay_marks_order_paid(self):
        self.client.force_authenticate(self.alice)
        self.client.post("/api/orders/cart-items/", {"ticket_id": self.ticket.id, "quantity": 1})
        response = self.client.post("/api/orders/orders/checkout/")
        order_id = response.data["id"]

        response = self.client.post(f"/api/orders/orders/{order_id}/pay/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["mode"], "fake")

        order = Order.objects.get(pk=order_id)
        self.assertEqual(order.status, Order.PAID)
        self.assertIsNotNone(order.paid_at)

    def test_order_detail_includes_event_info_and_per_unit_references(self):
        self.client.force_authenticate(self.alice)
        self.client.post("/api/orders/cart-items/", {"ticket_id": self.ticket.id, "quantity": 3})
        response = self.client.post("/api/orders/orders/checkout/")
        order_id = response.data["id"]

        response = self.client.get(f"/api/orders/orders/{order_id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item = response.data["items"][0]
        self.assertEqual(item["event_id"], self.ticket.event_id)
        self.assertEqual(item["event_location"], "Nairobi")
        self.assertEqual(len(item["references"]), 3)
        self.assertEqual(len(set(item["references"])), 3)
