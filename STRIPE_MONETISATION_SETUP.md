# Stripe Monetisation Setup

Neat Notes now supports real Stripe subscription checkout.

## Commercial Strategy

The platform uses a generous but limited free tier:

- Free users can create notes.
- Free users can explore the first 3 OCR Computer Science topic packs.
- Free users see the rest of the OCR library, but locked with a Pro prompt.

The upgrade path is:

- **Student Pro** - unlocks the full OCR library, Quick Practice, unlimited notes/spaces, exports, study packs, version history and peer collaboration.
- **Teacher** - unlocks Student Pro features plus classroom spaces, class join codes, teacher dashboards and class analytics.
- **Institution** - remains a sales conversation for schools/colleges rather than instant checkout.

This lets students experience the product before payment, while putting the highest-value revision and classroom features behind paid tiers.

## Stripe Products To Create

In Stripe, create these products:

### Product 1: Neat Notes Student Pro

Suggested price:

```text
£3.99/month
```

Copy the recurring Price ID. It looks like:

```text
price_123...
```

Render environment variable:

```text
STRIPE_PRICE_PRO=price_123...
```

### Product 2: Neat Notes Teacher

Suggested price:

```text
£9.99/month
```

Render environment variable:

```text
STRIPE_PRICE_TEACHER=price_123...
```

### Product 3: Institution

Keep this as custom pricing for now. The app sends institution interest to the Contact page.

You can add this later if you want instant institution checkout:

```text
STRIPE_PRICE_INSTITUTION=price_123...
```

## Render Environment Variables

Add these in Render:

```text
STRIPE_SECRET_KEY=sk_live_or_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_TEACHER=price_...
STRIPE_PRICE_INSTITUTION=
ALLOW_MOCK_BILLING=false
FREE_REVISION_TOPIC_LIMIT=3
```

Use Stripe test keys first. Only switch to live keys when you are ready to take real payments.

## Webhook Setup

In Stripe:

1. Go to **Developers > Webhooks**.
2. Add endpoint.
3. Endpoint URL:

```text
https://YOUR_RENDER_URL.onrender.com/api/billing/stripe/webhook
```

4. Select events:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
```

5. Copy the webhook signing secret.
6. Paste it into Render:

```text
STRIPE_WEBHOOK_SECRET=whsec_...
```

7. Redeploy.

## Billing Portal

In Stripe, configure the Customer Portal:

1. Go to **Settings > Billing > Customer portal**.
2. Enable subscription cancellation/update options that you want.
3. Save.

The app uses this endpoint:

```text
POST /api/billing/customer-portal
```

The user opens it through **Plans > Manage billing**.

## How The Paywall Works

Server-side:

- Free users only get backend access to the first 3 seeded revision decks.
- Pro and Teacher users get `fullRevisionLibrary`.
- Quick Practice is a Pro/Teacher feature.
- PDF export, version history, study packs and collaboration are already gated by plan entitlements.
- Teacher dashboard and classroom spaces are Teacher/Institution features.

Frontend:

- Locked topic packs remain visible as conversion teasers.
- Clicking locked packs opens the plan modal.
- Pro/Teacher buttons redirect to Stripe Checkout.
- Institution button opens Contact.

## Testing Checklist

1. Use Stripe test mode.
2. Add test `STRIPE_SECRET_KEY`.
3. Add test price IDs.
4. Add webhook endpoint.
5. Create a free account in Neat Notes.
6. Click **Plans > Upgrade to Pro**.
7. Use Stripe test card:

```text
4242 4242 4242 4242
```

8. Complete checkout.
9. Return to the app.
10. Check that Pro features unlock after the webhook lands.
11. Open `/api/health` to confirm the app is healthy.

## Important Notes

- Do not put Stripe keys in GitHub.
- Do not enable `ALLOW_MOCK_BILLING` in production.
- Webhooks are what permanently update the user plan after payment.
- Checkout returning to the app is not enough by itself; Stripe must send the webhook.
