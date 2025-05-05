#!/usr/bin/env node

/**
 * This script checks if your user account has a studio initialized
 * and creates one if needed. It helps diagnose and fix the 404 error
 * when accessing project pages.
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const readline = require('readline');

// Create Prisma client
const prisma = new PrismaClient();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to prompt for user input
function prompt(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

// Main function
async function main() {
  try {
    console.log('🔍 Checking studio initialization status...');
    
    // Get user email from input
    const email = await prompt('Enter your user email: ');
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { Tenant: true }
    });
    
    if (!user) {
      console.error(`❌ User with email "${email}" not found`);
      rl.close();
      process.exit(1);
    }
    
    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      tenantId: user.tenantId,
      tenantType: user.Tenant?.type
    });
    
    // Check if user has a tenant
    if (!user.Tenant) {
      console.log('❌ User has no tenant assigned');
      
      // Create tenant for the user
      const createTenant = await prompt('Create a tenant for this user? (y/n): ');
      if (createTenant.toLowerCase() === 'y') {
        const tenantName = await prompt('Enter tenant name: ');
        const tenantType = await prompt('Enter tenant type (STUDIO or TALENT): ');
        
        // Create tenant
        const newTenant = await prisma.tenant.create({
          data: {
            id: crypto.randomUUID(),
            name: tenantName,
            type: tenantType.toUpperCase(),
            updatedAt: new Date(),
            User: {
              connect: { id: user.id }
            }
          }
        });
        
        console.log('✅ Tenant created:', newTenant);
        
        // Update user with tenant
        await prisma.user.update({
          where: { id: user.id },
          data: { tenantId: newTenant.id }
        });
        
        console.log('✅ User updated with tenant');
        
        // Re-fetch user
        const updatedUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: { Tenant: true }
        });
        
        user.Tenant = updatedUser.Tenant;
        user.tenantId = updatedUser.tenantId;
      } else {
        console.log('❌ Tenant creation skipped. User needs a tenant to access projects.');
        rl.close();
        process.exit(1);
      }
    }
    
    // Check if user has STUDIO tenant type
    if (user.Tenant.type !== 'STUDIO') {
      console.log('❌ User tenant type is not STUDIO:', user.Tenant.type);
      
      // Update tenant type
      const updateTenantType = await prompt('Update tenant type to STUDIO? (y/n): ');
      if (updateTenantType.toLowerCase() === 'y') {
        await prisma.tenant.update({
          where: { id: user.Tenant.id },
          data: { type: 'STUDIO' }
        });
        
        console.log('✅ Tenant type updated to STUDIO');
      } else {
        console.log('❌ Tenant type update skipped. User needs STUDIO tenant type to access projects.');
      }
    } else {
      console.log('✅ User has STUDIO tenant type');
    }
    
    // Check if studio exists for this tenant
    const studio = await prisma.studio.findFirst({
      where: { tenantId: user.Tenant.id }
    });
    
    if (!studio) {
      console.log('❌ No studio found for this tenant');
      
      // Create studio
      const createStudio = await prompt('Create a studio for this tenant? (y/n): ');
      if (createStudio.toLowerCase() === 'y') {
        const studioName = await prompt(`Enter studio name (default: ${user.Tenant.name}): `) || user.Tenant.name;
        
        // Create studio
        const newStudio = await prisma.studio.create({
          data: {
            id: crypto.randomUUID(),
            name: studioName,
            tenantId: user.Tenant.id,
            description: `Studio for ${studioName}`,
            updatedAt: new Date()
          }
        });
        
        console.log('✅ Studio created:', {
          id: newStudio.id,
          name: newStudio.name,
          tenantId: newStudio.tenantId
        });
      } else {
        console.log('❌ Studio creation skipped. User needs a studio to access projects.');
        rl.close();
        process.exit(1);
      }
    } else {
      console.log('✅ Studio found:', {
        id: studio.id,
        name: studio.name,
        tenantId: studio.tenantId
      });
    }
    
    console.log('\n✅ All checks and fixes completed!');
    console.log('You should now be able to access projects.');
    console.log('Try visiting /studio/projects in your application.');
    
    rl.close();
  } catch (error) {
    console.error('Error:', error);
    rl.close();
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run main function
main();