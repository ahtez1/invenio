from django_filters.rest_framework import FilterSet

from .models import Event


class EventFilter(FilterSet):
    class Meta:
        model = Event
        fields = {
            "title": ["icontains"],
            "location": ["icontains"],
            "date": ["exact", "gte", "lte"],
            "collection_id": ["exact"],
            "organizer_id": ["exact"],
        }
