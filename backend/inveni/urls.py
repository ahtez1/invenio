from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/accounts/", include("accounts.urls")),
    path("api/events/", include("events.urls")),
    path("api/orders/", include("orders.urls")),
]

# Serve user-uploaded media (event photos, profile pictures) regardless of
# DEBUG. django.views.static.serve isn't the fastest option at real scale,
# but this app has no CDN/object storage configured, so it's this or 404s
# in production - fine at this app's traffic level.
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
