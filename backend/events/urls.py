from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers

from . import views

app_name = "events"

router = DefaultRouter()
router.register("events", views.EventViewSet, basename="events")
router.register("collections", views.CollectionViewSet, basename="collections")

events_router = routers.NestedDefaultRouter(router, "events", lookup="event")
events_router.register("tickets", views.TicketViewSet, basename="event-tickets")
events_router.register("images", views.EventImageViewSet, basename="event-images")
events_router.register("reviews", views.ReviewViewSet, basename="event-reviews")

urlpatterns = router.urls + events_router.urls
