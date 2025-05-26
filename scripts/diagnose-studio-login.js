#!/usr/bin/env node

/**
 * Diagnose Studio Login Issues
 * 
 * This script helps diagnose and fix studio login infinite loop issues
 * by checking the database state and providing clear instructions.
 */

const { PrismaClient } = require('@prisma/client');

// Create Prisma client
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 STUDIO LOGIN DIAGNOSIS\n');

    // Get all studio users
    const studioUsers = await prisma.user.findMany({
      include: { Tenant: true },
      where: {
        Tenant: {
          type: 'STUDIO'
        }
      }
    });

    console.log('🏢 STUDIO USERS IN DATABASE:');
    if (studioUsers.length === 0) {
      console.log('❌ No studio users found in database');
      console.log('\nℹ️  If you need to create a studio user, use the registration process');
      return;
    }

    for (const user of studioUsers) {
      console.log(`\n✅ Studio User Found:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   User ID: ${user.id}`);
      console.log(`   Tenant: ${user.Tenant?.name} (ID: ${user.Tenant?.id})`);
      
      // Check if studio is initialized
      const studio = await prisma.studio.findFirst({
        where: { tenantId: user.Tenant.id }
      });
      
      if (studio) {
        console.log(`   Studio: ✅ Initialized - "${studio.name}"`);
      } else {
        console.log(`   Studio: ❌ NOT INITIALIZED`);
        console.log(`   ⚠️  This user needs studio initialization`);
      }
    }

    // Check for any orphaned studios
    const allStudios = await prisma.studio.findMany({
      include: { Tenant: true }
    });

    console.log(`\n🏢 TOTAL STUDIOS: ${allStudios.length}`);
    
    const orphanedStudios = allStudios.filter(studio => !studio.Tenant);
    if (orphanedStudios.length > 0) {
      console.log(`⚠️  Found ${orphanedStudios.length} orphaned studios (no tenant):`);
      orphanedStudios.forEach(studio => {
        console.log(`   - ${studio.name} (ID: ${studio.id})`);
      });
    }

    // Instructions
    console.log('\n🔧 TROUBLESHOOTING INSTRUCTIONS:');
    console.log('\n1. INFINITE LOOP ISSUE:');
    console.log('   If you\'re experiencing an infinite loop after login:');
    console.log('   a) Clear your browser cookies/session data');
    console.log('   b) Sign out completely from the application');
    console.log('   c) Sign back in with the correct credentials');
    
    console.log('\n2. CORRECT STUDIO CREDENTIALS:');
    studioUsers.forEach(user => {
      console.log(`   - Use: ${user.email}`);
    });
    
    console.log('\n3. STUDIO NOT INITIALIZED:');
    const uninitializedUsers = [];
    for (const user of studioUsers) {
      const studio = await prisma.studio.findFirst({
        where: { tenantId: user.Tenant.id }
      });
      if (!studio) {
        uninitializedUsers.push(user);
      }
    }
    
    if (uninitializedUsers.length > 0) {
      console.log('   The following users need studio initialization:');
      uninitializedUsers.forEach(user => {
        console.log(`   - ${user.email}`);
      });
      console.log('   Run: node scripts/studio-auto-initializer.js');
    } else {
      console.log('   ✅ All studios are properly initialized');
    }

    console.log('\n4. IF PROBLEMS PERSIST:');
    console.log('   a) Check server logs for specific error messages');
    console.log('   b) Run: node scripts/clear-stale-sessions.js');
    console.log('   c) Restart the application server');

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run main function
main();