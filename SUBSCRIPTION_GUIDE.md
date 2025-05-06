# QCard Subscription System Guide

This guide explains how to use and extend the subscription system in QCard.

## Overview

The subscription system allows you to:

1. Create and manage subscription plans with different features
2. Process payments through Stripe
3. Restrict access to features based on subscription status
4. Handle subscription lifecycle events (creation, updates, cancellation)

## Setup

### Environment Variables

Ensure these environment variables are set:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### Create Subscription Plans

Run the setup script to create subscription plans in Stripe and sync with the database:

```bash
npm run stripe:setup-plans
```

This will create three plans:
- Basic ($19.99/month)
- Professional ($39.99/month)
- Business ($99.99/month)

### Webhook Setup

For local development, you can use the Stripe CLI to forward webhooks:

```bash
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

For production, set up a webhook in the Stripe dashboard pointing to:
`https://yourdomain.com/api/webhooks/stripe`

## Usage

### Protecting Routes with Middleware

Routes that require a subscription are defined in `src/lib/subscription-middleware.ts`. Add paths to the `SUBSCRIPTION_PROTECTED_PATHS` array:

```javascript
const SUBSCRIPTION_PROTECTED_PATHS = [
  '/studio/talent-search',
  '/studio/questionnaires',
  // Add more paths here
];
```

### Feature Flag Usage

Feature flags are defined in the database and can be checked using the client hook:

```javascript
import { useHasFeatureAccess } from '@/hooks/use-subscription';

function MyComponent() {
  const { hasAccess, isLoading } = useHasFeatureAccess('advanced_search');
  
  if (isLoading) return <Loading />;
  
  return hasAccess ? <AdvancedSearch /> : <BasicSearch />;
}
```

### Gating UI Components

Use the provided components to gate UI elements based on subscription:

```javascript
import { SubscriptionGate, FeatureGate } from '@/components/subscription/subscription-gates';

// Gate entire section based on having any subscription
<SubscriptionGate>
  <PremiumFeature />
</SubscriptionGate>

// Gate based on specific feature access
<FeatureGate featureKey="questionnaires">
  <QuestionnaireBuilder />
</FeatureGate>

// Disabled mode for buttons/controls
<FeatureGate featureKey="advanced_search" mode="disable">
  <AdvancedFilterButton />
</FeatureGate>

// Compact notification
<FeatureGate featureKey="custom_branding" mode="compact">
  <BrandingSettings />
</FeatureGate>
```

### Upgrade Button

Add upgrade buttons to encourage subscription:

```javascript
import { UpgradeButton } from '@/components/subscription/subscription-gates';

<UpgradeButton featureKey="unlimited_messages" />
```

## Testing

You can test the subscription flow using the test script:

```bash
npm run stripe:test-subscription <USER_ID>
```

This creates a test subscription for the specified user and checks feature access.

For real payment testing, use Stripe test cards:
- 4242 4242 4242 4242 (successful payment)
- 4000 0000 0000 9995 (declined payment)

## Common Tasks

### Adding a New Feature Flag

1. Add the feature key to `SUBSCRIPTION_FEATURES` in `src/lib/subscription-middleware.ts`
2. Add the feature to the database:

```javascript
await prisma.featureFlag.create({
  data: {
    id: uuidv4(),
    key: 'my_new_feature',
    name: 'My New Feature',
    description: 'Description of the feature',
    defaultValue: false
  }
});
```

3. Update the subscription plans to include the feature:

```javascript
await prisma.subscriptionPlan.update({
  where: { id: 'plan-id' },
  data: {
    features: ['existing_feature', 'my_new_feature']
  }
});
```

### Handling Subscription States

The subscription can have the following states:
- `ACTIVE`: User has an active subscription
- `TRIALING`: User is in trial period
- `PAST_DUE`: Payment failed but retry is possible
- `CANCELED`: Subscription has been canceled
- `INCOMPLETE`: Initial payment failed
- `INCOMPLETE_EXPIRED`: Incomplete subscription expired
- `UNPAID`: Subscription unpaid after retries

These states are updated automatically by the Stripe webhook handler.

## Architecture

- **Database Models**: Defined in `prisma/schema.prisma` (SubscriptionPlan, Subscription, SubscriptionFeature, FeatureFlag)
- **API Routes**: Defined in `src/app/api/` for subscription management and feature access
- **Webhook Handler**: Handles Stripe events in `src/app/api/webhooks/stripe/route.ts`
- **Client Hooks**: Provides client-side subscription state in `src/hooks/use-subscription.ts`
- **UI Components**: Subscription UI elements in `src/components/subscription/`
- **Middleware**: Route protection in `src/lib/subscription-middleware.ts`

## Troubleshooting

- **Stripe Events Not Being Received**: Check webhook setup and logs
- **Feature Access Issues**: Clear browser cookies and verify subscription status in the database
- **Middleware Not Working**: Check for cookie issues and session propagation
- **Payment Failed**: Verify Stripe configuration and test with different cards