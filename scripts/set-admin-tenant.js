#!/usr/bin/env node

/**
 * Script to set a user's tenant type to ADMIN
 */

const { PrismaClient } = require('@prisma/client');
// Force using local database URL
process.env.DATABASE_URL = "postgresql://jake:password1@localhost:5432/postgres";
const prisma = new PrismaClient();

async function setAdminTenant(email) {
  if (!email) {
    console.error('❌ Error: Email address is required');
    console.error('Usage: node scripts/set-admin-tenant.js <user-email>');
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
        tenantId: true,
        Tenant: true
      },
    });

    if (!user) {
      console.error(`❌ Error: User with email ${email} not found`);
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.firstName || ''} ${user.lastName || ''} <${user.email}>`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Current tenant: ${user.Tenant ? `${user.Tenant.name} (${user.Tenant.type})` : 'None'}`);
    
    // Create or find admin tenant
    let adminTenant = await prisma.tenant.findFirst({
      where: { type: 'ADMIN' }
    });
    
    if (!adminTenant) {
      console.log('Creating ADMIN tenant...');
      adminTenant = await prisma.tenant.create({
        data: {
          id: `admin-${Date.now()}`,
          name: 'Admin Tenant',
          type: 'ADMIN',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
    
    // Update user tenant
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        tenantId: adminTenant.id
      },
      include: {
        Tenant: true
      }
    });
    
    console.log(`✅ Updated user tenant:`);
    console.log(`   New tenant: ${updatedUser.Tenant.name} (${updatedUser.Tenant.type})`);
    console.log('\nPlease sign out and sign back in for changes to take effect.');

  } catch (error) {
    console.error('❌ Error updating user tenant:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line arguments
const email = process.argv[2] || 'jake+admin@wyman.dev';
setAdminTenant(email);