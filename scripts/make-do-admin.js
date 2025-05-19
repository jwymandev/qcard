#!/usr/bin/env node

/**
 * DIGITAL OCEAN ADMIN USER CREATION SCRIPT
 * 
 * This script creates an admin user and tenant in the Digital Ocean database.
 * Run this after resetting the database to ensure you have admin access.
 */

const { PrismaClient } = require('@prisma/client');
const readline = require('readline');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

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
  console.log('🔧 DIGITAL OCEAN ADMIN USER CREATION SCRIPT');
  
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
    
    // Create Prisma client
    const prisma = new PrismaClient();
    
    console.log('\nConnecting to database...');
    
    // Create tenant
    console.log('Creating tenant...');
    const tenant = await prisma.tenant.create({
      data: {
        name: tenantName,
        slug: tenantSlug,
      },
    });
    console.log(`Tenant created: ${tenant.name} (ID: ${tenant.id})`);
    
    // Create admin user
    console.log('Creating admin user...');
    const user = await prisma.user.create({
      data: {
        email: email,
        password: hashedPassword,
        name: name,
        role: 'ADMIN',
        tenantId: tenant.id,
      },
    });
    console.log(`Admin user created: ${user.email} (ID: ${user.id})`);
    
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