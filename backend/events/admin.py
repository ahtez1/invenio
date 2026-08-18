from django.contrib import admin
from django.db.models import Count
from django.utils.html import format_html

from . import models


class TicketInline(admin.TabularInline):
    model = models.Ticket
    extra = 1


class EventImageInline(admin.TabularInline):
    model = models.EventImage
    extra = 0
    readonly_fields = ["thumbnail"]

    def thumbnail(self, instance):
        if instance.image:
            return format_html('<img src="{}" style="max-height: 60px" />', instance.image.url)
        return ""


@admin.register(models.Event)
class EventAdmin(admin.ModelAdmin):
    inlines = [TicketInline, EventImageInline]
    list_display = ["title", "date", "time", "location", "organizer"]
    list_filter = ["date", "collection"]
    search_fields = ["title", "location", "organizer__email"]
    ordering = ["date", "time"]
    autocomplete_fields = ["organizer"]


@admin.register(models.Collection)
class CollectionAdmin(admin.ModelAdmin):
    list_display = ["title", "events_count"]
    search_fields = ["title"]

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(events_count=Count("events"))

    @admin.display(ordering="events_count")
    def events_count(self, collection):
        return collection.events_count


@admin.register(models.Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ["event", "ticket_type", "price", "quantity_available"]
    list_filter = ["ticket_type"]
    search_fields = ["event__title"]


@admin.register(models.Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ["event", "user", "rating", "created_at"]
    list_filter = ["rating", "created_at"]
    search_fields = ["event__title", "user__email"]
