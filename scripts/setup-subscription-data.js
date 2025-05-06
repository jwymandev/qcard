/**
 * Script to set up initial subscription plans and feature flags
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupSubscriptionData() {
  console.log('Setting up subscription plans and feature flags...');
  
  try {
    // Create default subscription plans
    const plans = [
      {
        id: 'plan_basic',
        name: 'Basic',
        description: 'Access to one location',
        price: 19.99,
        interval: 'month',
        features: ['basic_messaging', 'max_locations_1', 'subscribed'],
        isActive: true
      },
      {
        id: 'plan_pro',
        name: 'Professional',
        description: 'Access to all locations and premium features',
        price: 39.99,
        interval: 'month',
        features: ['unlimited_messaging', 'advanced_search', 'questionnaires', 'max_locations_5', 'subscribed'],
        isActive: true
      },
      {
        id: 'plan_business',
        name: 'Business',
        description: 'Everything in Pro plus enterprise features',
        price: 99.99,
        interval: 'month',
        features: ['unlimited_messaging', 'advanced_search', 'questionnaires', 'unlimited_locations', 'custom_branding', 'external_actors', 'priority_support', 'subscribed'],
        isActive: true
      }
    ];
    
    console.log('Creating subscription plans...');
    for (const plan of plans) {
      // Check if plan exists
      const existingPlan = await prisma.subscriptionPlan.findUnique({
        where: { id: plan.id }
      });
      
      if (existingPlan) {
        console.log(`Plan ${plan.name} already exists, updating...`);
        await prisma.subscriptionPlan.update({
          where: { id: plan.id },
          data: {
            name: plan.name,
            description: plan.description,
            price: plan.price,
            interval: plan.interval,
            features: plan.features,
            isActive: plan.isActive
          }
        });
      } else {
        console.log(`Creating plan ${plan.name}...`);
        await prisma.subscriptionPlan.create({
          data: {
            id: plan.id,
            name: plan.name,
            description: plan.description,
            price: plan.price,
            interval: plan.interval,
            features: plan.features,
            isActive: plan.isActive
          }
        });
      }
    }
    
    // Create feature flags
    const featureFlags = [
      {
        id: 'flag_adv_search',
        key: 'advanced_search',
        name: 'Advanced Talent Search',
        description: 'Access to advanced search filters and talent matching',
        defaultValue: false
      },
      {
        id: 'flag_quest',
        key: 'questionnaires',
        name: 'Custom Questionnaires',
        description: 'Create and manage custom questionnaires for talents',
        defaultValue: false
      },
      {
        id: 'flag_unlimited_msg',
        key: 'unlimited_messaging',
        name: 'Unlimited Messaging',
        description: 'Send unlimited messages to talents',
        defaultValue: false
      },
      {
        id: 'flag_ext_actors',
        key: 'external_actors',
        name: 'External Actor Management',
        description: 'Manage actors that are not yet on the platform',
        defaultValue: false
      },
      {
        id: 'flag_casting_calls',
        key: 'casting_calls',
        name: 'Casting Calls',
        description: 'Create and manage casting calls',
        defaultValue: false
      },
      {
        id: 'flag_custom_brand',
        key: 'custom_branding',
        name: 'Custom Branding',
        description: 'Customize branding for your studio',
        defaultValue: false
      },
      {
        id: 'flag_multi_proj',
        key: 'multiple_projects',
        name: 'Multiple Projects',
        description: 'Manage multiple projects simultaneously',
        defaultValue: false
      },
      {
        id: 'flag_subscribed',
        key: 'subscribed',
        name: 'Active Subscription',
        description: 'User has an active subscription',
        defaultValue: false
      }
    ];
    
    console.log('Creating feature flags...');
    for (const flag of featureFlags) {
      // Check if flag exists
      const existingFlag = await prisma.featureFlag.findUnique({
        where: { key: flag.key }
      });
      
      if (existingFlag) {
        console.log(`Feature flag ${flag.name} already exists, updating...`);
        await prisma.featureFlag.update({
          where: { key: flag.key },
          data: {
            name: flag.name,
            description: flag.description,
            defaultValue: flag.defaultValue
          }
        });
      } else {
        console.log(`Creating feature flag ${flag.name}...`);
        await prisma.featureFlag.create({
          data: {
            id: flag.id,
            key: flag.key,
            name: flag.name,
            description: flag.description,
            defaultValue: flag.defaultValue
          }
        });
      }
    }
    
    console.log('Subscription setup complete!');
  } catch (error) {
    console.error('Error setting up subscription data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  setupSubscriptionData().catch(console.error);
}

module.exports = { setupSubscriptionData };