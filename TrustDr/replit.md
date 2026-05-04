# Trust Doctor — Rockefeller Blueprint Edition

## Project Overview
AI-powered pro se trust framework generator. Users go through a 5-step wizard to get AI-generated trust analysis, Rockefeller blueprint scoring, trust document generation, and document gap analysis.

## Architecture
- **Backend**: `server.js` — Express server on port 5000 (serves static files + API proxy)
- **Frontend**: `trust-doctor/` — vanilla JS/HTML/CSS, no build step required
- **AI**: Google Gemini (via `GOOGLE_AI_API_KEY`), proxied at `/api/messages` and `/api/pdf-extract`
- **Payments**: Stripe (direct API keys — see note below)
- **Database**: Replit PostgreSQL (`DATABASE_URL`) — stores purchase records in `td_purchases` table

## Key Files
- `server.js` — main server: AI proxy, Stripe checkout, PDF extraction, access checks
- `stripeClient.js` — Stripe SDK client using `STRIPE_SECRET_KEY` directly
- `webhookHandlers.js` — Stripe webhook processing
- `scripts/seed-products.js` — run once to create the $19 full-download product in Stripe
- `trust-doctor/js/paywall.js` — frontend paywall logic (preview, modal, checkout redirect)
- `trust-doctor/js/api.js` — all AI calls + token usage tracker
- `trust-doctor/js/tabs.js` — step 3 tab renderers (doc tab has preview/paywall)
- `trust-doctor/js/pdf.js` — document and report download generators
- `trust-doctor/css/main.css` — all styles including paywall modal

## Environment Variables / Secrets Required
| Secret | Purpose |
|---|---|
| `GOOGLE_AI_API_KEY` | Google Gemini AI (set) |
| `STRIPE_SECRET_KEY` | Stripe API — starts with `sk_test_` or `sk_live_` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret — starts with `whsec_` |
| `DATABASE_URL` | PostgreSQL connection (auto-set by Replit) |

## Stripe Setup Note
**The Replit Stripe connector was dismissed by the user.** Stripe is integrated using direct API keys stored as Replit secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`). Do NOT attempt to use the Replit Stripe connector integration — use the secrets directly.

To get keys: https://dashboard.stripe.com/apikeys  
To get webhook secret: https://dashboard.stripe.com/webhooks (add endpoint for `/api/stripe/webhook`)

After adding keys, run the seed script once:
```
node scripts/seed-products.js
```

## Paywall Logic
- Users get a free 2-page (~1800 char) preview of generated trust documents
- Download requires a $19 one-time Stripe Checkout payment
- After payment, Stripe webhook records the purchase in `td_purchases` linked to a browser session ID
- On return from Stripe, URL param `?paid=1` sets localStorage flag
- `/api/access/:sessionId` verifies paid status server-side

## Admin Dashboard
URL: `/admin` — password protected via HTTP Basic Auth.
- **Username:** anything
- **Password:** value of `ADMIN_PASSWORD` env var (default: `TrustDoc2025!`)
- Shows: total purchases, total revenue, 30-day stats, purchase table with customer email + Stripe payment intent IDs

To change the password, update the `ADMIN_PASSWORD` env var in Replit and restart.

## Email Receipts (Resend)
After a successful Stripe payment, the server's `handleCheckoutComplete` webhook handler:
1. Looks up the stored doc from `td_pending_docs` (saved when checkout session was created)
2. Sends a formatted HTML email via Resend with the full trust document attached as a `.html` file
3. Cleans up the pending doc row

From address is `onboarding@resend.dev` (Resend test domain). To send from a custom domain, verify a domain at resend.com/domains and update the `from` field in `email.js`.

**Secret required:** `RESEND_API_KEY` (set)

## Model Selector
Dropdown in the top bar lets users switch between Gemini 2.5 Flash, 2.5 Pro, and 2.0 Flash. Model is passed to the server proxy and validated against an allowlist.

## Token Counter
Tracks input + output tokens per session in the top bar. Turns amber at 20k tokens, red at 50k.
