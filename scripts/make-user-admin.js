#!/usr/bin/env node

/**
 * Script to promote a user to ADMIN role
 * 
 * Usage:
 *   node scripts/make-user-admin.js <user-email>
 * 
 * Example:
 *   node scripts/make-user-admin.js admin@example.com
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function makeUserAdmin(email) {
  if (!email) {
    console.error('❌ Error: Email address is required');
    console.error('Usage: node scripts/make-user-admin.js <user-email>');
    process.exit(1);
  }

  console.log(`🔍 Looking for user with email: ${email}`);
  
  try {
    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    if (!user) {
      console.error(`❌ Error: User with email ${email} not found`);
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.firstName || ''} ${user.lastName || ''} <${user.email}>`);
    console.log(`   Current role: ${user.role}`);

    if (user.role === 'ADMIN') {
      console.log('ℹ️ User is already an admin');
      process.exit(0);
    }

    // Update the user's role to ADMIN
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'ADMIN' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    console.log(`🔑 Successfully changed role for ${updatedUser.email}`);
    console.log(`   New role: ${updatedUser.role}`);

  } catch (error) {
    console.error('❌ Error changing user role:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line arguments
const email = process.argv[2];
makeUserAdmin(email);