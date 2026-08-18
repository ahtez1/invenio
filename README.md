# Inveni

Browse events, buy tickets, host your own. An Eventbrite-style events and
ticketing marketplace, built end to end: organizers create events with
priced ticket tiers, attendees browse/search, add tickets to a cart, and
check out through a real (optional) Stripe payment.

- **Backend:** Django 5 + Django REST Framework, JWT auth
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Payments:** [Stripe](https://stripe.com/) — real card payments via PaymentIntents, with a zero-signup fake mode for local demoing

The app ships in **fake payment mode** by default: checkout completes
instantly with no external accounts needed. See
[Design notes](#design-notes) for why, and
[Using real Stripe](#using-real-stripe-optional) to switch it on.

## Prerequisites

- Python 3.11+ (built and tested on 3.13)
- Node.js 18+ (built and tested on 22)
- No database server, no Docker, no external accounts needed for the default demo mode

## 1. Get the code

```bash
git clone https://github.com/ahtez1/inveni.git
cd inveni
```

## 2. Start the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver       # http://localhost:8000
```

Leave this running. In a **new terminal**, run the test suite to confirm
everything's wired up correctly:

```bash
cd backend && source .venv/bin/activate && python manage.py test
```

You should see `Ran 23 tests ... OK`.

Create an organizer account from the admin if you want to poke around the
Django admin at `http://localhost:8000/admin/`:

```bash
python manage.py createsuperuser
```

## 3. Start the frontend

In another new terminal:

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev                      # http://localhost:3000
```

## 4. Walk through the app

Open `http://localhost:3000` and:

1. **Sign up** for an account (any email, username, password 8+ characters).
2. Go to **My events → Create event**, fill in a title/description/date/
   location, then add one or more ticket tiers (Regular/VIP/VVIP, each with
   its own price and quantity) and a cover photo.
3. Log out and register a **second account** — this is the attendee. Browse
   events on the home page, search by title or location, open the event
   you just created.
4. Pick a ticket tier and quantity, **add to cart**, then go to the cart
   and hit **Checkout**.
5. On the checkout page, **Pay** — in fake mode this completes instantly
   (no card details needed) and the order confirmation is printed to the
   backend's console (its email backend). Check **My tickets** to see the
   order.
6. Go back to the event as the organizer and confirm the ticket tier's
   remaining quantity dropped by the amount purchased.
7. As the attendee, leave a **review** on the event page.

To sanity-check data isolation: the attendee account should never be able
to edit the organizer's event, edit someone else's review, or see anyone
else's cart/orders (this is covered by the backend test suite too).

## Using real Stripe (optional)

To prove out the live payment integration instead of the fake fallback:

1. Sign up free at [dashboard.stripe.com](https://dashboard.stripe.com/register)
   and grab your **test mode** publishable + secret keys.
2. Fill in `backend/.env`:
   ```bash
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```
3. Fill in `frontend/.env.local`:
   ```bash
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```
4. Restart the backend. No code changes needed on the frontend — the
   checkout page reads a `mode` field from the pay response and renders
   Stripe's Payment Element automatically instead of the one-click fake
   "Pay" flow.
5. Use Stripe's [test card `4242 4242 4242 4242`](https://docs.stripe.com/testing)
   with any future expiry/CVC to pay for real (in test mode).
6. To confirm orders from Stripe webhooks rather than the client redirect,
   point a webhook at `POST /api/orders/webhook/stripe/` (e.g. via
   `stripe listen --forward-to localhost:8000/api/orders/webhook/stripe/`)
   and set `STRIPE_WEBHOOK_SECRET` in `backend/.env`.

## How it works

1. **Browse & add to cart** — `GET /api/events/events/` supports search,
   location, and date filters. Adding a ticket tier to the cart
   (`POST /api/orders/cart-items/`) always resolves the cart from
   `request.user` — there's no cart ID or user ID anywhere in the request
   body (`backend/orders/views.py`).
2. **Checkout** — `POST /api/orders/orders/checkout/` turns the cart into
   an `Order`, locking the relevant `Ticket` rows (`select_for_update`)
   inside one atomic transaction so two attendees can never oversell the
   same ticket tier, then snapshots each line's event title/ticket
   type/price onto the `OrderItem` so a later price edit never rewrites
   order history (`backend/orders/services.py`).
3. **Pay** — `POST /api/orders/orders/{id}/pay/` asks the dual-mode
   payment client for a payment: fake mode marks the order paid instantly;
   live mode creates a Stripe PaymentIntent and returns its client secret
   for the frontend's Payment Element to confirm
   (`backend/orders/payment_client.py`). A Stripe webhook confirms live
   payments server-side and is the source of truth for `payment_status`.
4. **Confirmation email** — fires on confirmed payment via Django's own
   email backend: prints to the console in dev, real SMTP once
   `EMAIL_HOST` is set (`backend/orders/emails.py`).

## Design notes

**Dual-mode payment client.** `backend/orders/payment_client.py` defines a
small interface with a `LiveStripeClient` implementation (talks to the
real Stripe API) and a `FakePaymentClient` implementation (marks the order
paid immediately, no network call). `settings.py` picks the live client
automatically the moment `STRIPE_SECRET_KEY` is present in `.env` — no
code changes needed either way. This is what makes the whole app runnable
by anyone who clones it with zero signups, while staying a real
integration rather than a permanent demo crutch.

**No client-supplied cart or user IDs.** The old prototype this was built
from trusted a client-supplied cart UUID for every cart mutation — anyone
who guessed or intercepted a cart ID could add or remove items from a
stranger's cart. Every cart/order endpoint here is scoped through
`request.user` instead; there is no cart ID in any URL or request body.

**Ticket stock can't be oversold.** The original ticket-purchase code
decremented `quantity_available` on every `OrderItem.save()` (including
edits, not just creation) and never checked available stock before
selling. `create_order_from_cart` now locks the ticket rows for the
transaction's duration and rejects checkout if requested quantity exceeds
what's left, verified by `orders/tests.py::CheckoutStockTests`.

**Security baseline.** Every endpoint other than register/login/refresh
requires JWT auth. `DEBUG` defaults to `False` and `SECRET_KEY` is never
committed. `CORS_ALLOWED_ORIGINS` is an explicit allowlist, never a
wildcard. Refresh tokens rotate and are blacklisted after use (real
logout). Register/login are throttled to slow down credential stuffing.
Event/ticket/image writes require the event's organizer or staff; reviews
can only be edited or deleted by their author — both covered by
regression tests asserting one user can never modify another's data
(`events/tests.py`, `orders/tests.py`).

## Project structure

```
backend/
  accounts/    email-based User, JWT register/login/refresh/me
  events/      Event, Ticket, Collection, EventImage, Review
  orders/      Cart, Order, dual-mode checkout + Stripe payment
frontend/
  app/         browse, event detail, login/register, dashboard (create/manage
               events), cart, checkout, my tickets, profile (Next.js App Router)
  components/  Navbar, EventCard, TicketTierPicker, ReviewList, StripeCheckoutForm
  lib/         JWT-aware API client, auth context, cart context, shared types
```

## Troubleshooting

**Static assets 403, or HMR websocket fails to connect in dev.** Next.js's
dev server blocks cross-origin requests to dev assets/HMR by default, and
treats `127.0.0.1` and `localhost` as different origins even on the same
machine. Both are already allowlisted in `frontend/next.config.ts` via
`allowedDevOrigins` — if you're hitting this from a different hostname
(e.g. a LAN IP), add it there and restart the dev server.

**`Cannot connect to backend` / network errors in the browser console.**
Confirm the backend is running on port 8000 and that
`frontend/.env.local`'s `NEXT_PUBLIC_API_URL` matches how you're accessing
the frontend — be consistent about `localhost` vs `127.0.0.1`.

**Event photo doesn't show up.** Make sure `backend/media/` is writable
and the backend is running with `DEBUG=True` locally (media is only
served directly by Django in debug mode — production deployments should
serve it from object storage or a real web server).

## Not built (deliberately, to keep this focused)

- Docker / CI pipeline
- Organizer payouts (Stripe Connect) — every payment here settles to a
  single platform Stripe account; a production version would swap in
  Connect to pay organizers directly without changing the rest of the
  checkout flow
- Deployment configs for a specific host — the app is deploy-ready
  (env-driven settings, no hardcoded hosts) but no platform-specific
  config is included
- httpOnly-cookie token storage (currently `localStorage`, same pragmatic
  tradeoff as most SPA JWT setups — production hardening would move to
  httpOnly cookies + CSRF protection)
- Refunds/cancellations
