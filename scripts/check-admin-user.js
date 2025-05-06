/**
 * Script to check and fix admin user
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAndFixAdminUser() {
  try {
    // Find the user by email
    const user = await prisma.user.findFirst({
      where: { email: 'jake+admin@wyman.dev' },
      include: { Tenant: true }
    });

    if (!user) {
      console.log('User not found. Please check the email address.');
      return;
    }

    console.log('Current user status:');
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log(`Tenant ID: ${user.tenantId || 'null'}`);
    console.log(`Tenant Type: ${user.Tenant?.type || 'null'}`);

    // Check if user has SUPER_ADMIN role
    if (user.role !== 'SUPER_ADMIN') {
      console.log('\nUpdating user role to SUPER_ADMIN...');
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'SUPER_ADMIN' }
      });
      console.log('Role updated to SUPER_ADMIN');
    } else {
      console.log('\nUser already has SUPER_ADMIN role');
    }

    // Check if there's an admin tenant
    let adminTenant = await prisma.tenant.findFirst({
      where: { type: 'ADMIN' }
    });

    // Create admin tenant if it doesn't exist
    if (!adminTenant) {
      console.log('\nCreating admin tenant...');
      adminTenant = await prisma.tenant.create({
        data: {
          id: require('crypto').randomUUID(),
          name: 'Admin Tenant',
          type: 'ADMIN',
          updatedAt: new Date()
        }
      });
      console.log(`Admin tenant created with ID: ${adminTenant.id}`);
    }

    // Update user's tenant if needed
    if (user.tenantId !== adminTenant.id) {
      console.log('\nUpdating user tenant to admin tenant...');
      await prisma.user.update({
        where: { id: user.id },
        data: { tenantId: adminTenant.id }
      });
      console.log('User tenant updated');
    } else {
      console.log('\nUser is already assigned to admin tenant');
    }

    // Verify the changes
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { Tenant: true }
    });

    console.log('\nUpdated user status:');
    console.log(`ID: ${updatedUser.id}`);
    console.log(`Email: ${updatedUser.email}`);
    console.log(`Role: ${updatedUser.role}`);
    console.log(`Tenant ID: ${updatedUser.tenantId || 'null'}`);
    console.log(`Tenant Type: ${updatedUser.Tenant?.type || 'null'}`);

    console.log('\n✅ Admin user setup complete!');
    console.log('Please sign out and sign back in for changes to take effect.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndFixAdminUser().catch(console.error);