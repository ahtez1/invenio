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
# traffic, so a `collectstatic` run there never reaches WhiteNoise. Running
# it here - before get_wsgi_application() builds the middleware chain and
# WhiteNoise takes its one-time snapshot of STATIC_ROOT - guarantees the
# files exist before that snapshot is taken, in the exact process serving
# requests.
django.setup()

from django.conf import settings  # noqa: E402

if not settings.DEBUG:
    from django.core.management import call_command  # noqa: E402

    call_command("collectstatic", interactive=False, verbosity=0)

application = get_wsgi_application()
