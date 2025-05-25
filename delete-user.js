#!/usr/bin/env node

/**
 * Delete User Script
 * Deletes a specific user and all their related data
 */

const { PrismaClient } = require('@prisma/client');

async function deleteUser(email) {
  console.log(`🗑️  Starting user deletion for: ${email}`);
  
  const prisma = new PrismaClient();
  
  try {
    // First find the user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        Tenant: true,
        Session: true,
        Account: true,
        Profile: true,
      }
    });

    if (!user) {
      console.log(`❌ User with email ${email} not found`);
      return;
    }

    console.log(`👤 Found user: ${user.email} (ID: ${user.id})`);
    if (user.Tenant) {
      console.log(`🏢 Associated tenant: ${user.Tenant.name} (ID: ${user.Tenant.id})`);
    }

    // Delete in the correct order to respect foreign key constraints
    console.log('🔄 Deleting user data...');

    // Delete sessions
    if (user.Session.length > 0) {
      await prisma.session.deleteMany({
        where: { userId: user.id }
      });
      console.log(`✅ Deleted ${user.Session.length} sessions`);
    }

    // Delete accounts
    if (user.Account.length > 0) {
      await prisma.account.deleteMany({
        where: { userId: user.id }
      });
      console.log(`✅ Deleted ${user.Account.length} accounts`);
    }

    // Delete profile if exists
    if (user.Profile) {
      await prisma.profile.delete({
        where: { userId: user.id }
      });
      console.log('✅ Deleted profile');
    }

    // Delete studio if user has a tenant with a studio
    if (user.Tenant) {
      const studio = await prisma.studio.findUnique({
        where: { tenantId: user.Tenant.id }
      });
      if (studio) {
        await prisma.studio.delete({
          where: { tenantId: user.Tenant.id }
        });
        console.log('✅ Deleted studio');
      }

      // Delete tenant
      await prisma.tenant.delete({
        where: { id: user.Tenant.id }
      });
      console.log('✅ Deleted tenant');
    }

    // Finally delete the user
    await prisma.user.delete({
      where: { id: user.id }
    });
    console.log('✅ Deleted user');

    console.log(`🎉 Successfully deleted user ${email} and all related data`);

  } catch (error) {
    console.error('❌ Error deleting user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log('Usage: node delete-user.js <email>');
  console.log('Example: node delete-user.js jake@wyman.dev');
  process.exit(1);
}

deleteUser(email).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});