#!/usr/bin/env node

/**
 * This script runs on application startup to fix common issues with studio initialization
 * It automatically creates studios for any users with STUDIO tenant type but no studio
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

// Create Prisma client
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🚀 Running automated studio initialization fix on startup...');

    // Find all tenants with STUDIO type that need initialization
    const studioTenants = await prisma.tenant.findMany({
      where: {
        type: 'STUDIO'
      }
    });

    console.log(`Found ${studioTenants.length} STUDIO type tenants`);

    // Process each tenant
    let needInitialization = 0;
    let success = 0;
    let alreadyExists = 0;
    
    for (const tenant of studioTenants) {
      // Check if studio already exists for this tenant
      const existingStudio = await prisma.studio.findFirst({
        where: { tenantId: tenant.id }
      });

      if (existingStudio) {
        alreadyExists++;
        continue;
      }

      needInitialization++;
      console.log(`Tenant ${tenant.id} (${tenant.name}) needs studio initialization`);

      try {
        // Create studio with tenant name or default
        const studioName = tenant.name || 'New Studio';
        
        const studio = await prisma.studio.create({
          data: {
            id: crypto.randomUUID(),
            name: studioName,
            tenantId: tenant.id,
            description: `Studio for ${studioName}`,
            updatedAt: new Date(),
          }
        });

        console.log(`✅ Created studio "${studio.name}" for tenant ${tenant.id}`);
        success++;
      } catch (error) {
        console.error(`❌ Error creating studio for tenant ${tenant.id}:`, error.message);
      }
    }

    // Log summary
    console.log('\n📊 Startup Fix Summary:');
    console.log(`Total STUDIO tenants: ${studioTenants.length}`);
    console.log(`Already initialized: ${alreadyExists}`);
    console.log(`Needed initialization: ${needInitialization}`);
    console.log(`Successfully initialized: ${success}`);

    if (needInitialization === 0) {
      console.log('✅ No studio initialization needed - all tenants have studios');
    } else if (success === needInitialization) {
      console.log('✅ All studio initialization completed successfully!');
    } else {
      console.log('⚠️ Some studio initializations failed. Check logs for details.');
    }
  } catch (error) {
    console.error('Error during startup fix:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the main function
main();