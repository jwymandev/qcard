#!/usr/bin/env node

/**
 * Debug Session Issue
 * 
 * This script helps diagnose and fix session-related issues where users
 * are stuck in infinite loops due to stale session data.
 */

const { PrismaClient } = require('@prisma/client');

// Create Prisma client
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Debugging session issue...\n');

    // Get the problematic IDs from logs
    const problemUserID = '5e9207d0-c4dc-441e-8b55-8d1c206e6f75';
    const problemTenantID = '1237965c-d2fe-4faf-a6e1-e5f77e464ca1';
    const problemEmail = 'jake+studi@wyman.dev';

    console.log('❌ Problematic IDs from logs:');
    console.log(`  User ID: ${problemUserID}`);
    console.log(`  Tenant ID: ${problemTenantID}`);
    console.log(`  Email: ${problemEmail}`);

    // Check if these exist in database
    const problemUser = await prisma.user.findUnique({
      where: { id: problemUserID },
      include: { Tenant: true }
    });

    const problemTenant = await prisma.tenant.findUnique({
      where: { id: problemTenantID }
    });

    console.log('\n🔍 Database check:');
    console.log(`  Problem user exists: ${problemUser ? 'YES' : 'NO'}`);
    console.log(`  Problem tenant exists: ${problemTenant ? 'YES' : 'NO'}`);

    if (!problemUser && !problemTenant) {
      console.log('\n✅ DIAGNOSIS: Session data is stale/corrupted');
      console.log('   The user and tenant IDs in the session do not exist in the database.');
      console.log('   This is likely due to database resets or data cleanup.');
    }

    // Find actual studio users
    console.log('\n✅ Actual studio users in database:');
    const studioUsers = await prisma.user.findMany({
      include: { Tenant: true },
      where: {
        Tenant: {
          type: 'STUDIO'
        }
      }
    });

    studioUsers.forEach(user => {
      console.log(`  - ${user.email} (ID: ${user.id})`);
      console.log(`    Tenant: ${user.Tenant?.name} (ID: ${user.Tenant?.id})`);
    });

    // Check if studios are properly initialized
    console.log('\n🏢 Studio initialization status:');
    for (const user of studioUsers) {
      if (user.Tenant) {
        const studio = await prisma.studio.findFirst({
          where: { tenantId: user.Tenant.id }
        });
        
        console.log(`  - ${user.email}: ${studio ? '✅ Studio initialized' : '❌ Studio missing'}`);
        
        if (!studio) {
          console.log(`    ⚠️  This user would need studio initialization`);
        }
      }
    }

    console.log('\n🔧 SOLUTION:');
    console.log('1. User should clear browser cookies/session data');
    console.log('2. User should sign out completely');
    console.log('3. User should sign in again with correct credentials');
    console.log('4. If using jake+studio@wyman.dev, the studio is already initialized');

    // Check for any session records that might be stuck
    console.log('\n🔍 Checking for session records...');
    try {
      const sessions = await prisma.session.findMany({
        where: {
          userId: problemUserID
        }
      });
      
      if (sessions.length > 0) {
        console.log(`❌ Found ${sessions.length} stale session(s) for problem user`);
        console.log('   These should be cleaned up.');
        
        // Delete stale sessions
        await prisma.session.deleteMany({
          where: {
            userId: problemUserID
          }
        });
        
        console.log('✅ Cleaned up stale sessions');
      } else {
        console.log('✅ No stale sessions found');
      }
    } catch (error) {
      console.log('ℹ️  Session table might not exist or be accessible');
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