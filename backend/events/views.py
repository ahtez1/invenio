from django.db.models import Count
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .filters import EventFilter
from .models import Collection, Event, EventImage, Review, Ticket
from .pagination import DefaultPagination
from .permissions import IsEventOrganizerOrStaff, IsOrganizerOrReadOnly, IsReviewAuthorOrReadOnly
from .serializers import (
    CollectionSerializer,
    EventDetailSerializer,
    EventImageSerializer,
    EventListSerializer,
    EventWriteSerializer,
    ReviewSerializer,
    TicketSerializer,
    TicketWriteSerializer,
)


class EventViewSet(ModelViewSet):
    queryset = Event.objects.select_related("organizer", "collection").prefetch_related(
        "images", "tickets", "reviews"
    )
    permission_classes = [IsAuthenticatedOrReadOnly, IsOrganizerOrReadOnly]
    filterset_class = EventFilter
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["title", "description", "location"]
    ordering_fields = ["date", "time", "location"]
    pagination_class = DefaultPagination

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return EventWriteSerializer
        if self.action == "retrieve":
            return EventDetailSerializer
        return EventListSerializer

    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)

    def destroy(self, request, *args, **kwargs):
        event = self.get_object()
        if Ticket.objects.filter(event=event, order_items__isnull=False).exists():
            return Response(
                {"error": "This event has ticket sales on record and cannot be deleted."},
                status=status.HTTP_405_METHOD_NOT_ALLOWED,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=["get"], url_path="recent", permission_classes=[AllowAny])
    def recent_events(self, request):
        events = self.filter_queryset(self.get_queryset()).order_by("-created_at")[:6]
        serializer = EventListSerializer(events, many=True, context=self.get_serializer_context())
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="mine")
    def my_events(self, request):
        events = self.get_queryset().filter(organizer=request.user)
        page = self.paginate_queryset(events)
        serializer = EventListSerializer(page, many=True, context=self.get_serializer_context())
        return self.get_paginated_response(serializer.data)


class CollectionViewSet(ModelViewSet):
    queryset = Collection.objects.annotate(events_count=Count("events"))
    serializer_class = CollectionSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_permissions(self):
        if self.request.method not in ("GET", "HEAD", "OPTIONS"):
            return [IsAdminUser()]
        return [AllowAny()]

    @action(detail=True, methods=["get"])
    def events(self, request, pk=None):
        collection = self.get_object()
        events = collection.events.select_related("organizer").prefetch_related("images", "tickets")
        serializer = EventListSerializer(events, many=True, context=self.get_serializer_context())
        return Response(serializer.data)


class EventNestedMixin:
    def get_event(self):
        if not hasattr(self, "_event"):
            self._event = get_object_or_404(Event, pk=self.kwargs["event_pk"])
        return self._event


class TicketViewSet(EventNestedMixin, ModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly, IsEventOrganizerOrStaff]

    def get_queryset(self):
        return Ticket.objects.filter(event_id=self.kwargs["event_pk"])

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return TicketWriteSerializer
        return TicketSerializer

    def perform_create(self, serializer):
        serializer.save(event=self.get_event())


class EventImageViewSet(EventNestedMixin, ModelViewSet):
    serializer_class = EventImageSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, IsEventOrganizerOrStaff]

    def get_queryset(self):
        return EventImage.objects.filter(event_id=self.kwargs["event_pk"])

    def perform_create(self, serializer):
        serializer.save(event=self.get_event())


class ReviewViewSet(EventNestedMixin, ModelViewSet):
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, IsReviewAuthorOrReadOnly]

    def get_queryset(self):
        return Review.objects.filter(event_id=self.kwargs["event_pk"]).select_related("user")

    def get_serializer_context(self):
        return {"event_id": self.kwargs["event_pk"], **super().get_serializer_context()}

    def create(self, request, *args, **kwargs):
        if Review.objects.filter(event_id=self.kwargs["event_pk"], user=request.user).exists():
            return Response(
                {"error": "You have already reviewed this event."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().create(request, *args, **kwargs)
