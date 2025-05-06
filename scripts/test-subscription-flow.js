/**
 * Script to test subscription flow and verify feature access
 * 
 * Usage:
 * node scripts/test-subscription-flow.js [userId]
 */

const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Helper to check user's current subscription status
 */
async function checkUserSubscription(userId) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] },
    },
    include: {
      plan: true,
      features: true
    },
    orderBy: {
      currentPeriodEnd: 'desc'
    }
  });
  
  if (!subscription) {
    console.log('❌ User has no active subscription');
    return null;
  }
  
  console.log('✅ User has an active subscription:');
  console.log(`  Plan: ${subscription.plan.name}`);
  console.log(`  Status: ${subscription.status}`);
  console.log(`  Current period: ${subscription.currentPeriodStart.toISOString()} to ${subscription.currentPeriodEnd.toISOString()}`);
  console.log(`  Cancel at period end: ${subscription.cancelAtPeriodEnd ? 'Yes' : 'No'}`);
  
  // Format features
  if (subscription.features && subscription.features.length > 0) {
    console.log('  Features:');
    subscription.features.forEach(feature => {
      console.log(`    - ${feature.featureKey}: ${JSON.stringify(feature.featureValue)}`);
    });
  } else {
    console.log('  No explicit feature overrides');
  }
  
  return subscription;
}

/**
 * Check access to each feature flag
 */
async function checkFeatureAccess(userId) {
  const featureFlags = await prisma.featureFlag.findMany();
  
  console.log('\nFeature Access:');
  
  for (const flag of featureFlags) {
    const hasAccess = await hasFeatureAccess(userId, flag.key);
    console.log(`  ${flag.key}: ${hasAccess ? '✅ Access Granted' : '❌ No Access'}`);
  }
}

/**
 * Check if user has access to specific feature
 */
async function hasFeatureAccess(userId, featureKey) {
  try {
    // First check if feature exists in global feature flags
    const featureFlag = await prisma.featureFlag.findUnique({
      where: { key: featureKey }
    });
    
    // If feature doesn't exist, return false
    if (!featureFlag) {
      return false;
    }
    
    // If feature is enabled for everyone, allow access
    if (featureFlag.defaultValue) {
      return true;
    }
    
    // Check if user has active subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ['ACTIVE', 'TRIALING'] },
      },
      include: {
        features: {
          where: { featureKey }
        },
        plan: true
      }
    });
    
    // No subscription means no premium features
    if (!subscription) {
      return false;
    }
    
    // Check if the subscription has this specific feature
    const feature = subscription.features.find(f => f.featureKey === featureKey);
    
    if (!feature) {
      // Check if the subscription plan includes this feature
      if (subscription.plan?.features) {
        // Check if feature is included in plan's feature list
        const planFeatures = subscription.plan.features;
        if (Array.isArray(planFeatures)) {
          return planFeatures.includes(featureKey);
        } else if (typeof planFeatures === 'object') {
          return planFeatures.hasOwnProperty(featureKey) && planFeatures[featureKey];
        }
      }
      
      return false;
    }
    
    // Feature exists, check its value
    try {
      // Feature might be a boolean, string, number, or object
      return typeof feature.featureValue === 'boolean' ? feature.featureValue : !!feature.featureValue;
    } catch (e) {
      return false;
    }
  } catch (error) {
    console.error(`Error checking feature access for ${featureKey}:`, error);
    return false;
  }
}

/**
 * Create test subscription for user
 */
async function createTestSubscription(userId, planName = 'Basic') {
  try {
    // First check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      console.error(`❌ User with ID ${userId} not found`);
      return null;
    }
    
    // Find the plan
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { name: planName }
    });
    
    if (!plan) {
      console.error(`❌ Subscription plan '${planName}' not found`);
      return null;
    }
    
    // Cancel any existing subscriptions
    await prisma.subscription.updateMany({
      where: {
        userId,
        status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] }
      },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    // Create a new test subscription
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30); // 30 days from now
    
    const subscription = await prisma.subscription.create({
      data: {
        id: uuidv4(),
        userId,
        planId: plan.id,
        status: 'ACTIVE',
        stripeCustomerId: `test_customer_${userId}`,
        stripeSubscriptionId: `test_subscription_${Date.now()}`,
        currentPeriodStart: now,
        currentPeriodEnd: endDate,
        cancelAtPeriodEnd: false,
        createdAt: now,
        updatedAt: now
      }
    });
    
    console.log(`✅ Created test subscription for user ${userId} with plan ${planName}`);
    
    // Add feature overrides if needed (for testing specific features)
    if (planName === 'Basic') {
      // Example: Give Basic users one premium feature for testing
      await prisma.subscriptionFeature.create({
        data: {
          id: uuidv4(),
          subscriptionId: subscription.id,
          featureKey: 'advanced_search',
          featureValue: true,
          createdAt: now,
          updatedAt: now
        }
      });
      
      console.log(`✅ Added 'advanced_search' feature override to the subscription`);
    }
    
    return subscription;
  } catch (error) {
    console.error('Error creating test subscription:', error);
    return null;
  }
}

/**
 * Run the test flow 
 */
async function testSubscriptionFlow() {
  try {
    // Get userId from command line or use a default
    const userId = process.argv[2];
    
    if (!userId) {
      console.error('❌ Please provide a userId as an argument');
      console.log('Usage: node scripts/test-subscription-flow.js [userId]');
      process.exit(1);
    }
    
    console.log(`Testing subscription flow for user: ${userId}`);
    
    // Check current subscription
    console.log('\n1. Checking current subscription status...');
    await checkUserSubscription(userId);
    
    // Check feature access before adding subscription
    console.log('\n2. Checking feature access before subscription...');
    await checkFeatureAccess(userId);
    
    // Create test subscription
    console.log('\n3. Creating test Basic subscription...');
    const subscription = await createTestSubscription(userId, 'Basic');
    
    if (!subscription) {
      console.error('❌ Failed to create test subscription');
      process.exit(1);
    }
    
    // Check updated subscription
    console.log('\n4. Checking updated subscription status...');
    await checkUserSubscription(userId);
    
    // Check feature access after adding subscription
    console.log('\n5. Checking feature access after subscription...');
    await checkFeatureAccess(userId);
    
    console.log('\n✅ Subscription test completed successfully');
  } catch (error) {
    console.error('Error testing subscription flow:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run test when called directly
if (require.main === module) {
  testSubscriptionFlow()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = {
  checkUserSubscription,
  checkFeatureAccess,
  createTestSubscription,
  testSubscriptionFlow
};