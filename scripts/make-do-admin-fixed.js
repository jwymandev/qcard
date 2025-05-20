#!/usr/bin/env node

/**
 * DIGITAL OCEAN ADMIN USER CREATION SCRIPT (FIXED VERSION)
 * 
 * This script creates an admin user and tenant in the Digital Ocean database.
 * This version includes ID generation for Tenant and User models.
 */

const { PrismaClient } = require('@prisma/client');
const readline = require('readline');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Set SSL verification to false
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Function to generate UUID
function generateUUID() {
  return crypto.randomUUID();
}

// Function to get admin details
function getAdminDetails() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    console.log('\n📝 ADMIN USER CREATION');
    console.log('Please provide details for the admin user:');
    
    let email = 'admin@example.com';
    let password = 'password123';
    let name = 'Admin User';
    let tenantName = 'Admin Tenant';

    rl.question(`Email (default: ${email}): `, (emailInput) => {
      if (emailInput.trim()) email = emailInput.trim();
      
      rl.question(`Password (default: ${password}): `, (passwordInput) => {
        if (passwordInput.trim()) password = passwordInput.trim();
        
        rl.question(`Name (default: ${name}): `, (nameInput) => {
          if (nameInput.trim()) name = nameInput.trim();
          
          rl.question(`Tenant name (default: ${tenantName}): `, (tenantInput) => {
            if (tenantInput.trim()) tenantName = tenantInput.trim();
            
            rl.close();
            resolve({ email, password, name, tenantName });
          });
        });
      });
    });
  });
}

// Main function
async function main() {
  console.log('🔧 DIGITAL OCEAN ADMIN USER CREATION SCRIPT (FIXED VERSION)');
  
  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.error('ERROR: DATABASE_URL is not set');
      console.error('Please set the DATABASE_URL environment variable to your Digital Ocean database connection string');
      process.exit(1);
    }
    
    // Extract host info for display (without credentials)
    try {
      const url = new URL(process.env.DATABASE_URL);
      console.log(`Connected to database: ${url.hostname}:${url.port}${url.pathname}`);
    } catch (e) {
      console.error('ERROR: Invalid database URL');
      process.exit(1);
    }
    
    // Get admin details
    const { email, password, name, tenantName } = await getAdminDetails();
    
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Generate a slug from the tenant name
    const tenantSlug = tenantName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    // Generate IDs
    const tenantId = generateUUID();
    const userId = generateUUID();
    
    // Create Prisma client
    const prisma = new PrismaClient();
    
    console.log('\nConnecting to database...');
    
    // Check if tenant or user already exists
    const existingTenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { slug: tenantSlug },
          { name: tenantName }
        ]
      }
    });
    
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingTenant) {
      console.log(`Tenant already exists: ${existingTenant.name} (ID: ${existingTenant.id})`);
      console.log('Using existing tenant...');
    } else {
      // Create tenant with ID
      console.log('Creating tenant...');
      try {
        // First, determine what fields are required for Tenant
        const tenantData = {
          id: tenantId,
          name: tenantName,
          slug: tenantSlug,
          // Add required fields here
          type: 'ADMIN', // Assuming type is required
        };
        
        // Create tenant
        const tenant = await prisma.tenant.create({
          data: tenantData
        });
        
        console.log(`Tenant created: ${tenant.name} (ID: ${tenant.id})`);
      } catch (error) {
        console.error(`ERROR creating tenant: ${error.message}`);
        
        // Check schema
        console.log('\nChecking Tenant schema requirements...');
        try {
          // Try to create with different fields based on error message
          if (error.message.includes('type')) {
            console.log('Attempting to create tenant without type field...');
            const tenant = await prisma.tenant.create({
              data: {
                id: tenantId,
                name: tenantName,
                slug: tenantSlug
              }
            });
            console.log(`Tenant created: ${tenant.name} (ID: ${tenant.id})`);
          } else {
            throw error;
          }
        } catch (secondError) {
          console.error(`Failed second attempt: ${secondError.message}`);
          console.error('Please check your Prisma schema for Tenant model requirements');
          
          // Try to find required fields in error message
          const errorMsg = secondError.message;
          console.log('\nAnalyzing error message for required fields...');
          console.log(errorMsg);
          
          // Exit if we can't create tenant
          await prisma.$disconnect();
          process.exit(1);
        }
      }
    }
    
    // Get the tenant ID (either from the new tenant or existing one)
    const actualTenantId = existingTenant ? existingTenant.id : tenantId;
    
    // Check if user exists
    if (existingUser) {
      console.log(`User already exists: ${existingUser.email} (ID: ${existingUser.id})`);
      
      // Update user to be admin
      console.log('Updating user to admin role...');
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          role: 'ADMIN',
          tenantId: actualTenantId
        }
      });
      
      console.log(`User updated: ${updatedUser.email} (Role: ${updatedUser.role})`);
    } else {
      // Create admin user
      console.log('Creating admin user...');
      try {
        const user = await prisma.user.create({
          data: {
            id: userId,
            email: email,
            password: hashedPassword,
            name: name,
            role: 'ADMIN',
            tenantId: actualTenantId,
          }
        });
        
        console.log(`Admin user created: ${user.email} (ID: ${user.id})`);
      } catch (error) {
        console.error(`ERROR creating user: ${error.message}`);
        
        // Try to create with minimum required fields
        console.log('\nAttempting to create user with minimum fields...');
        try {
          const user = await prisma.user.create({
            data: {
              id: userId,
              email: email,
              role: 'ADMIN',
              tenantId: actualTenantId,
              firstName: name.split(' ')[0] || '',
              lastName: name.split(' ').slice(1).join(' ') || '',
            }
          });
          
          console.log(`Admin user created: ${user.email} (ID: ${user.id})`);
        } catch (secondError) {
          console.error(`Failed second attempt: ${secondError.message}`);
          console.error('Please check your Prisma schema for User model requirements');
          await prisma.$disconnect();
          process.exit(1);
        }
      }
    }
    
    // Clean up
    await prisma.$disconnect();
    
    console.log('\n✅ ADMIN USER CREATION SUCCESSFUL');
    console.log('You can now log in with the following credentials:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    
  } catch (error) {
    console.error(`\nERROR: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();