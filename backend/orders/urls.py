from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

app_name = "orders"

router = DefaultRouter()
router.register("cart-items", views.CartItemViewSet, basename="cart-items")
router.register("orders", views.OrderViewSet, basename="orders")

urlpatterns = [
    path("cart/", views.CartView.as_view(), name="cart"),
    path("webhook/stripe/", views.StripeWebhookView.as_view(), name="stripe-webhook"),
    *router.urls,
]
