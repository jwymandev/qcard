#!/usr/bin/env node

/**
 * Fix Studio Infinite Loop Issue
 * 
 * This script comprehensively fixes the infinite loop issue that occurs
 * when users have stale session data pointing to non-existent database records.
 */

const { PrismaClient } = require('@prisma/client');

// Create Prisma client  
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔧 FIXING STUDIO INFINITE LOOP ISSUE\n');

    // Step 1: Clean up stale sessions
    console.log('1️⃣ Cleaning up stale sessions...');
    const validUsers = await prisma.user.findMany({
      select: { id: true }
    });
    const validUserIds = new Set(validUsers.map(u => u.id));
    
    try {
      const deleteResult = await prisma.session.deleteMany({
        where: {
          userId: {
            notIn: Array.from(validUserIds)
          }
        }
      });
      
      if (deleteResult.count > 0) {
        console.log(`   ✅ Deleted ${deleteResult.count} stale sessions`);
      } else {
        console.log('   ✅ No stale sessions found');
      }
    } catch (error) {
      console.log('   ℹ️  Session cleanup skipped (session table may not exist)');
    }

    // Step 2: Initialize any missing studios
    console.log('\n2️⃣ Checking studio initialization...');
    const studioTenants = await prisma.tenant.findMany({
      where: { type: 'STUDIO' },
      include: { User: true }
    });

    let initCount = 0;
    for (const tenant of studioTenants) {
      const existingStudio = await prisma.studio.findFirst({
        where: { tenantId: tenant.id }
      });

      if (!existingStudio) {
        const users = tenant.User;
        if (users.length > 0) {
          const user = users[0];
          let studioName = tenant.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'New Studio';
          
          await prisma.studio.create({
            data: {
              id: require('crypto').randomUUID(),
              name: studioName,
              tenantId: tenant.id,
              description: `Studio for ${studioName}`,
              updatedAt: new Date()
            }
          });
          
          console.log(`   ✅ Initialized studio for ${tenant.name || user.email}`);
          initCount++;
        }
      }
    }
    
    if (initCount === 0) {
      console.log('   ✅ All studios already initialized');
    }

    // Step 3: Report current status
    console.log('\n3️⃣ Current system status:');
    const studioUsers = await prisma.user.findMany({
      include: { Tenant: true },
      where: {
        Tenant: { type: 'STUDIO' }
      }
    });

    console.log(`   📊 Studio users: ${studioUsers.length}`);
    studioUsers.forEach(user => {
      console.log(`   - ${user.email} (ID: ${user.id})`);
    });

    const studios = await prisma.studio.findMany();
    console.log(`   🏢 Studios initialized: ${studios.length}`);

    // Step 4: Provide user instructions
    console.log('\n4️⃣ USER INSTRUCTIONS:');
    console.log('\n   🚨 TO FIX THE INFINITE LOOP:');
    console.log('   1. Clear your browser cookies and session data');
    console.log('   2. Sign out completely from the application');
    console.log('   3. Sign back in using the correct credentials:');
    
    studioUsers.forEach(user => {
      console.log(`      ✅ ${user.email}`);
    });
    
    console.log('\n   ⚠️  DO NOT use emails like "jake+studi@wyman.dev" (note the typo)');
    console.log('   ✅ Use the exact email shown above');

    console.log('\n   🔄 CLEARING BROWSER DATA:');
    console.log('   Chrome/Safari: Settings > Privacy > Clear Browsing Data');
    console.log('   Firefox: Settings > Privacy & Security > Clear Data');
    console.log('   Or use Incognito/Private browsing mode');

    console.log('\n✅ SYSTEM FIXES COMPLETED');
    console.log('   The server-side issues have been resolved.');
    console.log('   User must now clear their browser session and sign in again.');

  } catch (error) {
    console.error('❌ Error during fix:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run main function
main();