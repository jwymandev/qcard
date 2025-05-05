#!/usr/bin/env node

/**
 * Studio Auto-Initializer
 * 
 * This script automatically initializes studios for all users with STUDIO tenant type
 * but missing studio records. Run this as a one-time fix or include it in your
 * startup process to ensure all users can access projects.
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

// Create Prisma client
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Scanning for users with STUDIO tenant type but missing studio records...');

    // Find all users with STUDIO tenant type
    const studioTenants = await prisma.tenant.findMany({
      where: {
        type: 'STUDIO'
      },
      include: {
        User: true
      }
    });

    console.log(`Found ${studioTenants.length} tenants with STUDIO type`);

    // Count how many need initialization
    let needInitializationCount = 0;
    let alreadyInitializedCount = 0;
    let successCount = 0;
    let errorCount = 0;

    // Process each tenant
    for (const tenant of studioTenants) {
      // Check if this tenant already has a studio
      const existingStudio = await prisma.studio.findFirst({
        where: { tenantId: tenant.id }
      });

      if (existingStudio) {
        console.log(`✓ Tenant ${tenant.id} (${tenant.name}) already has a studio initialized`);
        alreadyInitializedCount++;
        continue;
      }

      needInitializationCount++;
      console.log(`⚠️ Tenant ${tenant.id} (${tenant.name}) needs studio initialization`);

      // Get associated user
      const users = tenant.User;
      if (!users || users.length === 0) {
        console.log(`  ❌ No users found for tenant ${tenant.id}`);
        errorCount++;
        continue;
      }

      // Use the first user with firstName or lastName as reference for studio name
      let studioName = tenant.name;
      const user = users.find(u => u.firstName || u.lastName) || users[0];
      
      if (!studioName && user) {
        studioName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      }
      
      if (!studioName) {
        studioName = 'New Studio';
      }

      try {
        // Create studio record
        const studio = await prisma.studio.create({
          data: {
            id: crypto.randomUUID(),
            name: studioName,
            tenantId: tenant.id,
            description: `Studio for ${studioName}`,
            updatedAt: new Date()
          }
        });

        console.log(`  ✅ Created studio "${studio.name}" for tenant ${tenant.id}`);
        successCount++;
      } catch (error) {
        console.error(`  ❌ Error creating studio for tenant ${tenant.id}:`, error.message);
        errorCount++;
      }
    }

    // Log summary
    console.log('\n📊 Summary:');
    console.log(`Total STUDIO tenants: ${studioTenants.length}`);
    console.log(`Already initialized: ${alreadyInitializedCount}`);
    console.log(`Needed initialization: ${needInitializationCount}`);
    console.log(`Successfully initialized: ${successCount}`);
    console.log(`Failed to initialize: ${errorCount}`);

    if (errorCount === 0 && needInitializationCount > 0) {
      console.log('\n✅ All studio initialization completed successfully!');
    } else if (errorCount > 0) {
      console.log('\n⚠️ Some studio initializations failed. Check errors above.');
    } else if (needInitializationCount === 0) {
      console.log('\n✓ All studios were already initialized. No action needed.');
    }

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run main function
main();