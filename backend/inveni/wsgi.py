"""
WSGI config for inveni project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.0/howto/deployment/wsgi/
"""

import os

import django
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'inveni.settings')

# Some PaaS setups (e.g. Railway) run pre-deploy/build steps in a container
# whose filesystem doesn't carry over to the one that ends up serving
# traffic, so `collectstatic`/`migrate` run there never reach the process
# that actually serves requests (for SQLite specifically, this also means
# the on-disk database itself doesn't carry over - each new container gets
# a fresh, empty file, so this is not a substitute for a persistent
# volume/managed Postgres, just what makes the app not 500 in the
# meantime). Running both here - before get_wsgi_application() builds the
# middleware chain and WhiteNoise takes its one-time snapshot of
# STATIC_ROOT - guarantees they've run in the exact process/filesystem
# that ends up serving requests.
django.setup()

from django.conf import settings  # noqa: E402

if not settings.DEBUG:
    from django.core.management import call_command  # noqa: E402

    call_command("migrate", interactive=False, verbosity=0)
    call_command("collectstatic", interactive=False, verbosity=0)

application = get_wsgi_application()
