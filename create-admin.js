const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

async function createAdminUser() {
  console.log('Creating admin user...');
  
  const prisma = new PrismaClient();
  
  try {
    // Create admin credentials
    const email = 'admin@example.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create tenant for admin
    const tenantId = uuidv4();
    const tenant = await prisma.tenant.create({
      data: {
        id: tenantId,
        name: 'Admin Tenant',
        type: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    
    console.log('Created tenant:', tenant.id);
    
    // Create admin user
    const userId = uuidv4();
    const user = await prisma.user.create({
      data: {
        id: userId,
        email,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'SUPER_ADMIN',
        tenantId: tenant.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    
    console.log('Created admin user:', user.id, user.email);
    console.log('You can now login with:');
    console.log('  Email:', email);
    console.log('  Password:', password);
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();