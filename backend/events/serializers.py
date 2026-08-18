from django.db.models import Avg
from rest_framework import serializers

from accounts.serializers import UserSerializer

from .models import Collection, Event, EventImage, Review, Ticket


class CollectionSerializer(serializers.ModelSerializer):
    events_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Collection
        fields = ["id", "title", "events_count"]


class TicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = ["id", "ticket_type", "price", "quantity_available"]


class TicketWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = ["id", "ticket_type", "price", "quantity_available"]
        read_only_fields = ["id"]

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value


class EventImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventImage
        fields = ["id", "image"]


class ReviewSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Review
        fields = ["id", "user", "rating", "text", "created_at"]

    def create(self, validated_data):
        event_id = self.context["event_id"]
        user = self.context["request"].user
        return Review.objects.create(event_id=event_id, user=user, **validated_data)


class EventListSerializer(serializers.ModelSerializer):
    organizer = UserSerializer(read_only=True)
    min_ticket_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    cover_image = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "id",
            "title",
            "date",
            "time",
            "location",
            "organizer",
            "min_ticket_price",
            "cover_image",
            "average_rating",
        ]

    def get_cover_image(self, event):
        first = event.images.first()
        if not first:
            return None
        request = self.context.get("request")
        url = first.image.url
        return request.build_absolute_uri(url) if request else url

    def get_average_rating(self, event):
        return event.reviews.aggregate(avg=Avg("rating"))["avg"]


class EventDetailSerializer(EventListSerializer):
    tickets = TicketSerializer(many=True, read_only=True)
    images = EventImageSerializer(many=True, read_only=True)
    description = serializers.CharField()

    class Meta(EventListSerializer.Meta):
        fields = EventListSerializer.Meta.fields + ["description", "tickets", "images"]


class EventWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ["id", "title", "description", "date", "time", "location", "collection"]
