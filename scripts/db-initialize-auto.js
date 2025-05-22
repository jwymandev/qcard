#!/usr/bin/env node

/**
 * Automatic Database Initialization Script
 * 
 * This script handles common initialization tasks required for application startup:
 * 1. Ensures database connection is properly configured
 * 2. Creates studios for users with STUDIO tenant type but no studio
 * 3. Creates an admin user if no admin exists
 * 4. Verifies project table and other critical schemas
 * 
 * Run this script during deployment or application startup to ensure
 * the database is properly initialized.
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

// Create Prisma client
let prisma;

// Database connection configuration helper
function configureDatabaseConnection() {
  try {
    // If DATABASE_URL is not properly configured, construct it from components
    if (!process.env.DATABASE_URL || 
        (!process.env.DATABASE_URL.startsWith('postgresql://') && 
         !process.env.DATABASE_URL.startsWith('postgres://'))) {
      
      console.log('Constructing DATABASE_URL from environment variables...');
      
      // Extract components
      const host = process.env.DATABASE_HOST || 'localhost';
      const port = process.env.DATABASE_PORT || '5432';
      const name = process.env.DATABASE_NAME || 'defaultdb';
      const username = process.env.DATABASE_USERNAME || 'postgres';
      const password = process.env.DATABASE_PASSWORD || '';
      
      // Encode password
      const encodedPassword = encodeURIComponent(password);
      
      // Verify database name is not the same as the host (common issue)
      const databaseName = host.includes(name) ? 'defaultdb' : name;
      
      // Construct URL with SSL for DigitalOcean
      const url = `postgresql://${username}:${encodedPassword}@${host}:${port}/${databaseName}?sslmode=require`;
      
      // Set environment variable
      process.env.DATABASE_URL = url;
      
      console.log(`✅ Set DATABASE_URL to: ${host}:${port}/${databaseName}`);
      return true;
    }
    
    console.log('✅ Using existing DATABASE_URL');
    return true;
  } catch (error) {
    console.error('❌ Error configuring database connection:', error.message);
    return false;
  }
}

// Initialize Prisma client with timeout handling
async function initializePrisma() {
  try {
    // Configure database connection first
    configureDatabaseConnection();
    
    // Create Prisma client
    prisma = new PrismaClient();
    
    // Test connection with timeout
    const connectionPromise = prisma.$connect();
    
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database connection timeout')), 10000);
    });
    
    // Race connection against timeout
    await Promise.race([connectionPromise, timeoutPromise]);
    
    console.log('✅ Connected to database successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
    return false;
  }
}

// Initialize studios for users with STUDIO tenant type
async function initializeStudios() {
  try {
    console.log('🚀 Running studio initialization...');
    
    // Find all tenants with STUDIO type
    const studioTenants = await prisma.tenant.findMany({
      where: {
        type: 'STUDIO'
      },
      include: {
        User: true
      }
    });
    
    console.log(`Found ${studioTenants.length} STUDIO type tenants`);
    
    // Process each tenant
    let needInitialization = 0;
    let success = 0;
    let alreadyExists = 0;
    
    for (const tenant of studioTenants) {
      // Check if studio already exists for this tenant
      const existingStudio = await prisma.studio.findFirst({
        where: { tenantId: tenant.id }
      });
      
      if (existingStudio) {
        alreadyExists++;
        continue;
      }
      
      needInitialization++;
      console.log(`Tenant ${tenant.id} (${tenant.name}) needs studio initialization`);
      
      try {
        // Determine studio name
        let studioName = tenant.name;
        
        // If tenant has no name but has users, use the first user's name
        if (!studioName && tenant.User && tenant.User.length > 0) {
          const user = tenant.User.find(u => u.firstName || u.lastName) || tenant.User[0];
          if (user) {
            studioName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
          }
        }
        
        // Default name
        if (!studioName) {
          studioName = 'New Studio';
        }
        
        // Create studio
        const studio = await prisma.studio.create({
          data: {
            id: crypto.randomUUID(),
            name: studioName,
            tenantId: tenant.id,
            description: `Studio for ${studioName}`,
            updatedAt: new Date(),
          }
        });
        
        console.log(`✅ Created studio "${studio.name}" for tenant ${tenant.id}`);
        success++;
      } catch (error) {
        console.error(`❌ Error creating studio for tenant ${tenant.id}:`, error.message);
      }
    }
    
    // Log summary
    console.log('\n📊 Studio Initialization Summary:');
    console.log(`Total STUDIO tenants: ${studioTenants.length}`);
    console.log(`Already initialized: ${alreadyExists}`);
    console.log(`Needed initialization: ${needInitialization}`);
    console.log(`Successfully initialized: ${success}`);
    
    if (needInitialization === 0) {
      console.log('✅ No studio initialization needed - all tenants have studios');
    } else if (success === needInitialization) {
      console.log('✅ All studio initialization completed successfully!');
    } else {
      console.log('⚠️ Some studio initializations failed. Check logs for details.');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error during studio initialization:', error.message);
    return false;
  }
}

// Ensure at least one admin user exists
async function ensureAdminExists() {
  try {
    console.log('🔐 Checking for admin users...');
    
    // Check if any admin users exist
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' }
    });
    
    if (adminCount > 0) {
      console.log(`✅ Found ${adminCount} existing admin users`);
      return true;
    }
    
    console.log('⚠️ No admin users found. Checking for default admin email...');
    
    // Check if DEFAULT_ADMIN_EMAIL is set
    const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL;
    if (!defaultAdminEmail) {
      console.log('ℹ️ No DEFAULT_ADMIN_EMAIL environment variable set. Skipping admin creation.');
      return true;
    }
    
    // Check if the user exists
    const user = await prisma.user.findUnique({
      where: { email: defaultAdminEmail }
    });
    
    if (!user) {
      console.log(`❌ User with email ${defaultAdminEmail} not found`);
      console.log('ℹ️ Cannot create admin user automatically - user must exist first');
      return false;
    }
    
    // Update user role to ADMIN
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'ADMIN' }
    });
    
    console.log(`✅ Updated user ${defaultAdminEmail} to ADMIN role`);
    return true;
  } catch (error) {
    console.error('❌ Error ensuring admin exists:', error.message);
    return false;
  }
}

// Verify critical database tables
async function verifyDatabaseTables() {
  try {
    console.log('🔍 Verifying critical database tables...');
    
    // List of critical tables to verify
    const tables = [
      { name: 'User', method: prisma.user.count },
      { name: 'Tenant', method: prisma.tenant.count },
      { name: 'Studio', method: prisma.studio.count },
      { name: 'Project', method: prisma.project.count }
    ];
    
    let allTablesOk = true;
    
    // Check each table
    for (const table of tables) {
      try {
        const count = await table.method();
        console.log(`✅ Table ${table.name} verified (${count} records)`);
      } catch (error) {
        console.error(`❌ Error verifying table ${table.name}:`, error.message);
        allTablesOk = false;
      }
    }
    
    return allTablesOk;
  } catch (error) {
    console.error('❌ Error verifying database tables:', error.message);
    return false;
  }
}

// Automated health check
async function runHealthCheck() {
  try {
    console.log('🏥 Running database health check...');
    
    // Test a simple query to verify database health
    const userCount = await prisma.user.count();
    console.log(`✅ Database health check passed (${userCount} users found)`);
    
    return true;
  } catch (error) {
    console.error('❌ Database health check failed:', error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log('🚀 Starting database auto-initialization...');
  
  try {
    // Initialize Prisma with connection configuration
    if (!await initializePrisma()) {
      console.error('❌ Failed to initialize database connection');
      process.exit(1);
    }
    
    // Run health check
    if (!await runHealthCheck()) {
      console.error('❌ Database health check failed');
      process.exit(1);
    }
    
    // Verify database tables
    if (!await verifyDatabaseTables()) {
      console.warn('⚠️ Some database tables could not be verified');
      // Continue anyway - we'll try to initialize what we can
    }
    
    // Initialize studios
    if (!await initializeStudios()) {
      console.warn('⚠️ Studio initialization encountered issues');
      // Continue anyway - other operations might still succeed
    }
    
    // Ensure admin exists
    if (!await ensureAdminExists()) {
      console.warn('⚠️ Admin user check encountered issues');
      // Continue anyway - other operations might still succeed
    }
    
    console.log('\n✅ Database initialization completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error during database initialization:', error);
    return false;
  } finally {
    // Disconnect Prisma client
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}

// Run the main function
main()
  .then(success => {
    if (success) {
      console.log('✅ Database auto-initialization completed successfully');
      process.exit(0);
    } else {
      console.error('❌ Database auto-initialization encountered errors');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Fatal error during database auto-initialization:', error);
    process.exit(1);
  });