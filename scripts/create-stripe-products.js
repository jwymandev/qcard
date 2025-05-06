/**
 * Script to create Stripe products and prices for the subscription plans
 * 
 * Run with: node scripts/create-stripe-products.js
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createStripeProducts() {
  console.log('Creating Stripe products and prices for subscription plans...');
  
  try {
    // Get all active subscription plans
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true }
    });
    
    console.log(`Found ${plans.length} active subscription plans`);
    
    for (const plan of plans) {
      // Create or update the product in Stripe
      console.log(`Processing plan: ${plan.name}`);
      
      // Check if this plan already has a Stripe price ID
      if (plan.stripePriceId) {
        console.log(`Plan ${plan.name} already has Stripe price ID: ${plan.stripePriceId}`);
        
        // Verify the price exists in Stripe
        try {
          const existingPrice = await stripe.prices.retrieve(plan.stripePriceId);
          console.log(`Verified price in Stripe: ${existingPrice.id}`);
          continue;
        } catch (error) {
          console.log(`Could not find price ${plan.stripePriceId} in Stripe, will create new product and price`);
        }
      }
      
      // Create a product in Stripe
      const product = await stripe.products.create({
        name: plan.name,
        description: plan.description || `${plan.name} Subscription`,
        metadata: {
          planId: plan.id,
        }
      });
      
      console.log(`Created Stripe product: ${product.id}`);
      
      // Create a price for the product
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(plan.price * 100), // Convert to cents
        currency: 'usd',
        recurring: {
          interval: plan.interval || 'month'
        },
        metadata: {
          planId: plan.id,
        }
      });
      
      console.log(`Created Stripe price: ${price.id}`);
      
      // Update the plan with the Stripe price ID
      await prisma.subscriptionPlan.update({
        where: { id: plan.id },
        data: { stripePriceId: price.id }
      });
      
      console.log(`Updated plan ${plan.name} with Stripe price ID: ${price.id}`);
    }
    
    console.log('Successfully created Stripe products and prices');
  } catch (error) {
    console.error('Error creating Stripe products:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  createStripeProducts().catch(console.error);
}

module.exports = { createStripeProducts };