import re

from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/accounts/", include("accounts.urls")),
    path("api/events/", include("events.urls")),
    path("api/orders/", include("orders.urls")),
]

# Serve user-uploaded media (event photos, profile pictures) regardless of
# DEBUG. django.conf.urls.static.static() is a no-op unless DEBUG=True, so
# it can't be used here - this calls the underlying view directly instead.
# django.views.static.serve isn't the fastest option at real scale, but
# this app has no CDN/object storage configured, so it's this or 404s in
# production - fine at this app's traffic level.
urlpatterns += [
    re_path(
        r"^%s(?P<path>.*)$" % re.escape(settings.MEDIA_URL.lstrip("/")),
        serve,
        {"document_root": settings.MEDIA_ROOT},
    ),
]
