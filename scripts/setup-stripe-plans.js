/**
 * Script to create subscription plans in Stripe and synchronize with database
 * 
 * Usage:
 * node scripts/setup-stripe-plans.js
 */

const { PrismaClient } = require('@prisma/client');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { v4: uuidv4 } = require('uuid');

// Initialize Prisma client
const prisma = new PrismaClient();

// Plans configuration
const subscriptionPlans = [
  {
    name: 'Basic',
    description: 'Access to one location',
    price: 19.99,
    interval: 'month',
    features: [
      'Access to one location',
      'Basic messaging (20 messages/month)',
      'Talent profile visibility',
      'Apply to casting calls',
      '7-day free trial'
    ]
  },
  {
    name: 'Professional',
    description: 'Access to all locations and premium features',
    price: 39.99,
    interval: 'month',
    features: [
      'Access to all locations',
      'Unlimited messaging',
      'Advanced talent search',
      'Custom questionnaires',
      'Unlimited casting calls',
      'Priority placement'
    ]
  },
  {
    name: 'Business',
    description: 'Everything in Pro plus enterprise features',
    price: 99.99,
    interval: 'month',
    features: [
      'Everything in Professional plan',
      'External actor management',
      'Advanced analytics',
      'Custom branding',
      'Dedicated support',
      'API access'
    ]
  }
];

// Feature flag definitions
const featureFlags = [
  {
    key: 'advanced_search',
    name: 'Advanced Search',
    description: 'Advanced filters and search capabilities for talent',
    defaultValue: false
  },
  {
    key: 'questionnaires',
    name: 'Custom Questionnaires',
    description: 'Create and manage custom questionnaires for talent',
    defaultValue: false
  },
  {
    key: 'unlimited_messages',
    name: 'Unlimited Messaging',
    description: 'Send unlimited messages to talent',
    defaultValue: false
  },
  {
    key: 'multiple_projects',
    name: 'Multiple Projects',
    description: 'Create and manage multiple projects',
    defaultValue: true
  },
  {
    key: 'casting_calls',
    name: 'Casting Calls',
    description: 'Create and publish casting calls',
    defaultValue: false
  },
  {
    key: 'custom_branding',
    name: 'Custom Branding',
    description: 'Customize the look and feel of your studio profile',
    defaultValue: false
  }
];

/**
 * Create a product in Stripe
 */
async function createStripeProduct(name, description) {
  try {
    const product = await stripe.products.create({
      name,
      description
    });
    
    console.log(`Created Stripe product: ${product.id} (${name})`);
    return product;
  } catch (error) {
    console.error(`Error creating Stripe product ${name}:`, error);
    throw error;
  }
}

/**
 * Create a price in Stripe
 */
async function createStripePrice(productId, unitAmount, interval) {
  try {
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: Math.round(unitAmount * 100), // Convert to cents
      currency: 'usd',
      recurring: { interval }
    });
    
    console.log(`Created Stripe price: ${price.id} ($${unitAmount}/${interval})`);
    return price;
  } catch (error) {
    console.error(`Error creating Stripe price for product ${productId}:`, error);
    throw error;
  }
}

/**
 * Create subscription plans in database and Stripe
 */
async function setupSubscriptionPlans() {
  try {
    console.log('Setting up subscription plans...');
    
    // Create feature flags if they don't exist
    for (const flag of featureFlags) {
      const existingFlag = await prisma.featureFlag.findUnique({
        where: { key: flag.key }
      });
      
      if (!existingFlag) {
        await prisma.featureFlag.create({
          data: {
            id: uuidv4(),
            key: flag.key,
            name: flag.name,
            description: flag.description,
            defaultValue: flag.defaultValue
          }
        });
        console.log(`Created feature flag: ${flag.key}`);
      } else {
        console.log(`Feature flag ${flag.key} already exists`);
      }
    }
    
    // Create plans in Stripe and database
    for (const plan of subscriptionPlans) {
      // Check if plan already exists by name
      const existingPlan = await prisma.subscriptionPlan.findFirst({
        where: { name: plan.name }
      });
      
      if (existingPlan) {
        console.log(`Plan ${plan.name} already exists`);
        
        // Update if stripePriceId is missing
        if (!existingPlan.stripePriceId) {
          console.log(`Creating Stripe product and price for existing plan ${plan.name}...`);
          
          // Create Stripe product
          const product = await createStripeProduct(plan.name, plan.description);
          
          // Create Stripe price
          const price = await createStripePrice(product.id, plan.price, plan.interval);
          
          // Update plan with Stripe info
          await prisma.subscriptionPlan.update({
            where: { id: existingPlan.id },
            data: {
              stripePriceId: price.id,
              updatedAt: new Date()
            }
          });
          
          console.log(`Updated plan ${plan.name} with Stripe price ID ${price.id}`);
        }
      } else {
        console.log(`Creating new plan ${plan.name}...`);
        
        // Create Stripe product
        const product = await createStripeProduct(plan.name, plan.description);
        
        // Create Stripe price
        const price = await createStripePrice(product.id, plan.price, plan.interval);
        
        // Create plan in database
        await prisma.subscriptionPlan.create({
          data: {
            id: uuidv4(),
            name: plan.name,
            description: plan.description,
            price: plan.price,
            interval: plan.interval,
            features: plan.features,
            stripePriceId: price.id,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        
        console.log(`Created plan ${plan.name} with Stripe price ID ${price.id}`);
      }
    }
    
    console.log('✅ Subscription plans setup complete!');
  } catch (error) {
    console.error('Error setting up subscription plans:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run setup
if (require.main === module) {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY environment variable is required');
    process.exit(1);
  }
  
  setupSubscriptionPlans()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { setupSubscriptionPlans };