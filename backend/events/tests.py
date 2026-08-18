from datetime import date, time

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Event, Review, Ticket

User = get_user_model()


def make_user(email):
    return User.objects.create_user(email=email, username=email.split("@")[0], password="S0meStrongPass!")


class EventOwnershipTests(APITestCase):
    def setUp(self):
        self.organizer = make_user("organizer@example.com")
        self.other = make_user("other@example.com")
        self.event = Event.objects.create(
            organizer=self.organizer,
            title="Tech Conference",
            description="A conference.",
            date=date(2026, 9, 1),
            time=time(10, 0),
            location="Nairobi",
        )

    def test_anyone_can_list_and_retrieve(self):
        response = self.client.get("/api/events/events/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response = self.client.get(f"/api/events/events/{self.event.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_only_organizer_can_update_event(self):
        self.client.force_authenticate(self.other)
        response = self.client.patch(
            f"/api/events/events/{self.event.id}/", {"title": "Hijacked"}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.event.refresh_from_db()
        self.assertEqual(self.event.title, "Tech Conference")

    def test_organizer_can_update_own_event(self):
        self.client.force_authenticate(self.organizer)
        response = self.client.patch(
            f"/api/events/events/{self.event.id}/", {"title": "Updated Title"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_anonymous_cannot_create_event(self):
        response = self.client.post(
            "/api/events/events/",
            {
                "title": "New Event",
                "description": "desc",
                "date": "2026-10-01",
                "time": "10:00:00",
                "location": "Nairobi",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_created_event_organizer_is_forced_to_requester(self):
        self.client.force_authenticate(self.other)
        response = self.client.post(
            "/api/events/events/",
            {
                "title": "My Own Event",
                "description": "desc",
                "date": "2026-10-01",
                "time": "10:00:00",
                "location": "Nairobi",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = Event.objects.get(pk=response.data["id"])
        self.assertEqual(created.organizer, self.other)


class TicketCreationTests(APITestCase):
    def setUp(self):
        self.organizer = make_user("organizer@example.com")
        self.other = make_user("other@example.com")
        self.event = Event.objects.create(
            organizer=self.organizer,
            title="Concert",
            description="A concert.",
            date=date(2026, 9, 1),
            time=time(20, 0),
            location="Mombasa",
        )

    def test_organizer_can_create_real_priced_tickets(self):
        self.client.force_authenticate(self.organizer)
        response = self.client.post(
            f"/api/events/events/{self.event.id}/tickets/",
            {"ticket_type": "VIP", "price": "49.99", "quantity_available": 100},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        ticket = Ticket.objects.get(pk=response.data["id"])
        self.assertEqual(ticket.ticket_type, "VIP")
        self.assertEqual(str(ticket.price), "49.99")
        self.assertEqual(ticket.quantity_available, 100)

    def test_non_organizer_cannot_create_tickets(self):
        self.client.force_authenticate(self.other)
        response = self.client.post(
            f"/api/events/events/{self.event.id}/tickets/",
            {"ticket_type": "Regular", "price": "10.00", "quantity_available": 50},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ReviewOwnershipTests(APITestCase):
    def setUp(self):
        self.organizer = make_user("organizer@example.com")
        self.author = make_user("author@example.com")
        self.intruder = make_user("intruder@example.com")
        self.event = Event.objects.create(
            organizer=self.organizer,
            title="Festival",
            description="A festival.",
            date=date(2026, 9, 1),
            time=time(12, 0),
            location="Kisumu",
        )
        self.review = Review.objects.create(
            event=self.event, user=self.author, rating=5, text="Great!"
        )

    def test_non_author_cannot_edit_review(self):
        self.client.force_authenticate(self.intruder)
        response = self.client.patch(
            f"/api/events/events/{self.event.id}/reviews/{self.review.id}/", {"text": "Hijacked"}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_author_cannot_delete_review(self):
        self.client.force_authenticate(self.intruder)
        response = self.client.delete(
            f"/api/events/events/{self.event.id}/reviews/{self.review.id}/"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Review.objects.filter(pk=self.review.id).exists())

    def test_author_can_edit_own_review(self):
        self.client.force_authenticate(self.author)
        response = self.client.patch(
            f"/api/events/events/{self.event.id}/reviews/{self.review.id}/", {"text": "Updated"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_cannot_review_same_event_twice(self):
        self.client.force_authenticate(self.author)
        response = self.client.post(
            f"/api/events/events/{self.event.id}/reviews/", {"rating": 4, "text": "Again"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
