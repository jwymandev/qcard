/**
 * Script to forcefully update a user's tenant type
 * 
 * Usage:
 * node scripts/fix-user-tenant.js <email> <tenantType>
 */

const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();

async function fixUserTenant(email, tenantType) {
  try {
    if (!email || !tenantType) {
      console.error('Please provide a user email and tenant type (ADMIN, STUDIO, or TALENT)');
      process.exit(1);
    }

    // Validate tenant type
    if (!['ADMIN', 'STUDIO', 'TALENT'].includes(tenantType.toUpperCase())) {
      console.error('Invalid tenant type. Must be one of: ADMIN, STUDIO, TALENT');
      process.exit(1);
    }

    // Normalize tenant type
    tenantType = tenantType.toUpperCase();

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { Tenant: true }
    });

    if (!user) {
      console.error(`User not found with email: ${email}`);
      process.exit(1);
    }

    console.log(`Found user: ${user.id} (${user.email})`);
    console.log(`Current tenant: ${user.Tenant?.type || 'None'}`);
    
    // Check if the tenant type already exists
    let tenant = await prisma.tenant.findFirst({
      where: { type: tenantType }
    });

    // Create the tenant if it doesn't exist
    if (!tenant) {
      console.log(`Creating new ${tenantType} tenant...`);
      tenant = await prisma.tenant.create({
        data: {
          id: `${tenantType.toLowerCase()}-${Date.now()}`,
          name: `${tenantType} Tenant`,
          type: tenantType,
          updatedAt: new Date()
        }
      });
      console.log(`Created tenant with ID: ${tenant.id}`);
    } else {
      console.log(`Found existing ${tenantType} tenant: ${tenant.id}`);
    }

    // Update the user's tenant
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { 
        tenantId: tenant.id,
        updatedAt: new Date()
      },
      include: { Tenant: true }
    });

    console.log(`\nUser tenant updated successfully:`);
    console.log(`ID: ${updatedUser.id}`);
    console.log(`Email: ${updatedUser.email}`);
    console.log(`New tenant: ${updatedUser.Tenant?.type || 'None'}`);
    
    // If changing to ADMIN, also set SUPER_ADMIN role
    if (tenantType === 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      console.log('\nSetting user role to SUPER_ADMIN...');
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'SUPER_ADMIN' }
      });
      console.log('User role updated to SUPER_ADMIN');
    }
    
    console.log("\nTo complete the process:");
    console.log("1. Clear the user's sessions:");
    console.log(`   npm run user:clear-sessions ${email}`);
    console.log("2. Have the user clear their browser cookies");
    console.log("3. Have the user sign in again");
    
  } catch (error) {
    console.error('Error updating user tenant:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email and tenant type from command line arguments
const email = process.argv[2];
const tenantType = process.argv[3];
fixUserTenant(email, tenantType).catch(console.error);