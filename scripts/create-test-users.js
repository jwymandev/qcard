/**
 * Create Test Users
 * 
 * This script creates test users for each role type to test authentication.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  console.log('Creating test users...');
  
  const password = await bcrypt.hash('password123', 10);
  const now = new Date();
  
  // Create a talent user
  const talentTenantId = crypto.randomUUID();
  const talentTenant = await prisma.tenant.create({
    data: {
      id: talentTenantId,
      name: 'Test Talent',
      type: 'TALENT',
      createdAt: now,
      updatedAt: now
    }
  });
  
  const talentUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email: 'test-talent@example.com',
      password,
      firstName: 'Test',
      lastName: 'Talent',
      role: 'USER',
      tenantId: talentTenantId,
      createdAt: now,
      updatedAt: now
    }
  });
  
  const profile = await prisma.profile.create({
    data: {
      id: crypto.randomUUID(),
      userId: talentUser.id,
      availability: true,
      createdAt: now,
      updatedAt: now
    }
  });
  
  console.log('Created talent user:', talentUser.email);
  
  // Create a studio user
  const studioTenantId = crypto.randomUUID();
  const studioTenant = await prisma.tenant.create({
    data: {
      id: studioTenantId,
      name: 'Test Studio',
      type: 'STUDIO',
      createdAt: now,
      updatedAt: now
    }
  });
  
  const studioUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email: 'test-studio@example.com',
      password,
      firstName: 'Test',
      lastName: 'Studio',
      role: 'ADMIN',
      tenantId: studioTenantId,
      createdAt: now,
      updatedAt: now
    }
  });
  
  const studio = await prisma.studio.create({
    data: {
      id: crypto.randomUUID(),
      name: 'Test Studio',
      tenantId: studioTenantId,
      description: 'Test Studio Description',
      createdAt: now,
      updatedAt: now
    }
  });
  
  console.log('Created studio user:', studioUser.email);
  
  // Create an admin user
  const adminTenantId = crypto.randomUUID();
  const adminTenant = await prisma.tenant.create({
    data: {
      id: adminTenantId,
      name: 'Admin',
      type: 'ADMIN',
      createdAt: now,
      updatedAt: now
    }
  });
  
  const adminUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email: 'admin@example.com',
      password,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      tenantId: adminTenantId,
      createdAt: now,
      updatedAt: now
    }
  });
  
  console.log('Created admin user:', adminUser.email);
  
  // Print out summary
  console.log('\nTest users created:');
  console.log('- Talent: test-talent@example.com / password123');
  console.log('- Studio: test-studio@example.com / password123');
  console.log('- Admin: admin@example.com / password123');
  
  await prisma.$disconnect();
}

main().catch(error => {
  console.error('Error creating test users:', error);
  prisma.$disconnect();
  process.exit(1);
});