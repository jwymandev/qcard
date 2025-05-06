#!/usr/bin/env node

/**
 * Script to check a user's role in the database
 */

const { PrismaClient } = require('@prisma/client');
// Force using local database URL
process.env.DATABASE_URL = "postgresql://jake:password1@localhost:5432/postgres";
const prisma = new PrismaClient();

async function checkUserRole(email) {
  if (!email) {
    console.error('❌ Error: Email address is required');
    console.error('Usage: node scripts/check-user-role.js <user-email>');
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
        Tenant: {
          select: {
            id: true,
            type: true,
            name: true
          }
        }
      },
    });

    if (!user) {
      console.error(`❌ Error: User with email ${email} not found`);
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.firstName || ''} ${user.lastName || ''} <${user.email}>`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Tenant: ${user.Tenant ? `${user.Tenant.name} (${user.Tenant.type})` : 'None'}`);
    
    // Also check any sessions this user might have
    const sessions = await prisma.session.findMany({
      where: {
        userId: user.id
      }
    });
    
    console.log(`   Active sessions: ${sessions.length}`);
    if (sessions.length > 0) {
      console.log('   Sessions will expire at:');
      sessions.forEach(session => {
        console.log(`   - ${session.expires.toISOString()}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking user role:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line arguments
const email = process.argv[2] || 'jake+admin@wyman.dev';
checkUserRole(email);