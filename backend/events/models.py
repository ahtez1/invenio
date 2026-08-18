from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from accounts.validators import validate_image_file


class Collection(models.Model):
    title = models.CharField(max_length=255)

    class Meta:
        ordering = ["title"]

    def __str__(self):
        return self.title


class Event(models.Model):
    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="organized_events"
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    date = models.DateField()
    time = models.TimeField()
    location = models.CharField(max_length=200)
    collection = models.ForeignKey(
        Collection, on_delete=models.SET_NULL, null=True, blank=True, related_name="events"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["date", "time"]

    def __str__(self):
        return self.title

    @property
    def min_ticket_price(self):
        prices = [t.price for t in self.tickets.all()]
        return min(prices) if prices else None


class Ticket(models.Model):
    REGULAR = "Regular"
    VIP = "VIP"
    VVIP = "VVIP"
    TICKET_TYPE_CHOICES = [(REGULAR, "Regular"), (VIP, "VIP"), (VVIP, "VVIP")]

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="tickets")
    ticket_type = models.CharField(max_length=10, choices=TICKET_TYPE_CHOICES)
    price = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0"))]
    )
    quantity_available = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["price"]
        unique_together = [["event", "ticket_type"]]

    def __str__(self):
        return f"{self.ticket_type} - {self.event.title}"


class EventImage(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="events/images/", validators=[validate_image_file])


class Review(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews"
    )
    rating = models.PositiveSmallIntegerField(
        default=5, validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = [["event", "user"]]

    def __str__(self):
        return f"{self.rating}★ by {self.user} on {self.event}"
