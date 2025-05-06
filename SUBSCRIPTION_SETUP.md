# Stripe Subscription Setup Guide

This guide explains how to set up and deploy the Stripe subscription system for controlling access to premium features.

## Prerequisites

1. A Stripe account (create one at [stripe.com](https://stripe.com))
2. Stripe API keys (available in your Stripe Dashboard)
3. PostgreSQL database (set up with Prisma)

## Setup Steps

### 1. Environment Variables

Add the following environment variables to your `.env` file:

```
# Stripe API keys
STRIPE_SECRET_KEY=sk_test_your_test_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Only add this in production
# STRIPE_SECRET_KEY=sk_live_your_live_key
# STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key
# STRIPE_WEBHOOK_SECRET=whsec_your_live_webhook_secret
```

### 2. Database Migration

Run the following commands to apply the subscription schema to your database:

```bash
# Apply the migrations
npx prisma migrate dev --name add_subscriptions

# Generate the Prisma client
npx prisma generate
```

This will create all the necessary tables for the subscription system:
- `SubscriptionPlan`
- `Subscription`
- `SubscriptionFeature`
- `FeatureFlag`

### 3. Create Stripe Products and Prices

Run the script to create the necessary products and prices in Stripe:

```bash
node scripts/create-stripe-products.js
```

This will:
- Create a product in Stripe for each subscription plan
- Create a price for each product
- Update the database with the Stripe price IDs

### 4. Set Up Stripe Webhooks

1. Install the Stripe CLI: [Installation Guide](https://stripe.com/docs/stripe-cli)
2. Forward webhooks to your local development server:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

3. For production, create a webhook endpoint in the Stripe Dashboard pointing to:
   - `https://yourdomain.com/api/webhooks/stripe`
   
4. Subscribe to the following events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`

### 5. Testing the Subscription Flow

1. Start your application
2. Navigate to `/subscription`
3. Select a plan and complete the checkout
4. You should be redirected back to your application
5. Verify that your subscription status is updated in the database

## Subscription Features

The following features can be controlled by subscription plans:

- `advanced_search` - Advanced talent search features
- `questionnaires` - Custom questionnaires for talents
- `unlimited_messaging` - Unlimited messaging with talents
- `external_actors` - External actor management
- `casting_calls` - Creating and managing casting calls
- `custom_branding` - Custom branding for studios
- `multiple_projects` - Managing multiple projects
- `subscribed` - General flag for active subscription

## Controlling Access to Features

### Server-side Check

```typescript
import { hasFeatureAccess } from '@/lib/subscription-helpers';

// Check if a user has access to a feature
const hasAccess = await hasFeatureAccess(userId, 'advanced_search');

if (hasAccess) {
  // Allow access to the feature
} else {
  // Deny access
}
```

### Client-side Check

```tsx
import { FeatureGate, SubscriptionGate } from '@/components/subscription/subscription-gates';

// Restrict access to a component based on subscription
<SubscriptionGate>
  <p>This content is only visible to subscribers</p>
</SubscriptionGate>

// Restrict access to a specific feature
<FeatureGate featureKey="advanced_search">
  <p>This content is only visible to users with advanced search</p>
</FeatureGate>
```

## Middleware Protection

The middleware automatically protects the following paths from non-subscribers:

- `/studio/talent-search`
- `/studio/questionnaires`
- `/studio/casting-calls`
- `/talent/questionnaires`
- `/admin/settings`

To add more protected paths, update the `SUBSCRIPTION_PROTECTED_PATHS` array in `/src/lib/subscription-middleware.ts`.

## Subscription API Endpoints

- `GET /api/user/subscription` - Get the current user's subscription
- `GET /api/user/features/{featureKey}` - Check if user has access to a feature
- `POST /api/create-subscription` - Create a Stripe checkout session for a subscription
- `POST /api/user/subscription/cancel` - Cancel a subscription
- `POST /api/user/subscription/resume` - Resume a canceled subscription

## Troubleshooting

### Webhook Issues

If webhooks aren't being processed:

1. Check the Stripe webhook logs in the Stripe Dashboard
2. Verify the webhook secret is correct in your environment variables
3. Check your server logs for any errors processing webhooks

### Subscription Not Showing Up

If a subscription doesn't appear after checkout:

1. Check if the checkout session was completed in Stripe
2. Verify the webhook for `checkout.session.completed` was received
3. Look for any errors in your server logs
4. Check if the database was updated correctly