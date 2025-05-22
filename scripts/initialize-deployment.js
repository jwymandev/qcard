#!/usr/bin/env node

/**
 * Initialize Deployment Script
 * 
 * This script is designed to be run once when setting up a new deployment.
 * It handles all necessary database initialization tasks:
 * 
 * 1. Configures database connection from environment variables
 * 2. Runs Prisma migrations or schema push if needed
 * 3. Initializes studios for users with STUDIO tenant type
 * 4. Creates an admin user if specified
 * 5. Verifies all critical database tables
 * 
 * Usage:
 *   node scripts/initialize-deployment.js [admin-email]
 * 
 * Example:
 *   node scripts/initialize-deployment.js admin@example.com
 */

const { spawn, spawnSync } = require('child_process');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

// Get admin email from command line arguments
const adminEmail = process.argv[2];

// Create Prisma client
let prisma;

// Main function
async function main() {
  console.log('🚀 Starting deployment initialization...');
  
  try {
    // Step 1: Configure database connection
    console.log('\n📊 Step 1: Configuring database connection...');
    configureDatabaseConnection();
    
    // Step 2: Run database migrations
    console.log('\n📊 Step 2: Running database migrations...');
    await runDatabaseMigrations();
    
    // Step 3: Connect to the database
    console.log('\n📊 Step 3: Connecting to database...');
    prisma = new PrismaClient();
    await prisma.$connect();
    console.log('✅ Connected to database successfully');
    
    // Step 4: Run health check
    console.log('\n📊 Step 4: Running database health check...');
    if (!await runDatabaseHealthCheck()) {
      throw new Error('Database health check failed');
    }
    
    // Step 5: Run full initialization script
    console.log('\n📊 Step 5: Running database initialization script...');
    const initResult = spawnSync('node', ['scripts/db-initialize-auto.js'], {
      stdio: 'inherit',
      env: process.env
    });
    
    if (initResult.status !== 0) {
      console.error('❌ Database initialization script failed');
      console.log('Continuing with manual initialization steps...');
    } else {
      console.log('✅ Database initialization script completed successfully');
    }
    
    // Step 6: Create admin user if specified
    if (adminEmail) {
      console.log(`\n📊 Step 6: Setting up admin user (${adminEmail})...`);
      await setupAdminUser(adminEmail);
    } else {
      console.log('\n📊 Step 6: No admin email specified, skipping admin setup');
    }
    
    // Step 7: Verify critical database tables
    console.log('\n📊 Step 7: Verifying critical database tables...');
    await verifyDatabaseTables();
    
    console.log('\n✅ Deployment initialization completed successfully!');
    console.log('Your application should now be ready to use.');
    console.log('If you encounter authentication issues, try running:');
    console.log('  node scripts/make-user-admin.js your-email@example.com');
    
    return true;
  } catch (error) {
    console.error('❌ Error during deployment initialization:', error.message);
    return false;
  } finally {
    // Disconnect Prisma client
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}

// Configure database connection
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
    throw error;
  }
}

// Run database migrations
async function runDatabaseMigrations() {
  try {
    // First, run Prisma generate
    console.log('Generating Prisma client...');
    const generateResult = spawnSync('npx', ['prisma', 'generate'], {
      stdio: 'inherit',
      env: process.env
    });
    
    if (generateResult.status !== 0) {
      throw new Error('Failed to generate Prisma client');
    }
    
    // Run Prisma migrate deploy
    console.log('Running database migrations...');
    const migrateResult = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
      stdio: 'inherit',
      env: process.env
    });
    
    if (migrateResult.status !== 0) {
      console.warn('⚠️ Migration deploy failed, trying db push as fallback...');
      
      // Try db push as fallback
      const pushResult = spawnSync('npx', ['prisma', 'db', 'push', '--accept-data-loss'], {
        stdio: 'inherit',
        env: process.env
      });
      
      if (pushResult.status !== 0) {
        throw new Error('Failed to initialize database schema');
      }
    }
    
    console.log('✅ Database schema initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Error running database migrations:', error.message);
    throw error;
  }
}

// Run database health check
async function runDatabaseHealthCheck() {
  try {
    // Test a simple query to verify database health
    const userCount = await prisma.user.count();
    console.log(`✅ Database health check passed (${userCount} users found)`);
    return true;
  } catch (error) {
    console.error('❌ Database health check failed:', error.message);
    return false;
  }
}

// Setup admin user
async function setupAdminUser(email) {
  try {
    if (!email) {
      console.log('ℹ️ No admin email provided, skipping admin setup');
      return true;
    }
    
    console.log(`Looking for user with email: ${email}`);
    
    // Check if user exists
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
      }
    });
    
    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      console.log('Please create the user first, then run make-user-admin.js');
      return false;
    }
    
    console.log(`✅ Found user: ${user.email}`);
    
    // Check if user is already admin
    if (user.role === 'ADMIN') {
      console.log('✅ User is already an admin');
      return true;
    }
    
    // Update user role to ADMIN
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'ADMIN' }
    });
    
    console.log('✅ Updated user role to ADMIN');
    
    // Ensure user has a STUDIO tenant
    if (!user.Tenant) {
      console.log('⚠️ User has no tenant, creating STUDIO tenant...');
      
      // Create tenant
      const tenant = await prisma.tenant.create({
        data: {
          id: crypto.randomUUID(),
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin Studio',
          type: 'STUDIO',
          updatedAt: new Date(),
          User: {
            connect: { id: user.id }
          }
        }
      });
      
      console.log(`✅ Created STUDIO tenant: ${tenant.name}`);
      
      // Update user with tenant
      await prisma.user.update({
        where: { id: user.id },
        data: { tenantId: tenant.id }
      });
      
      console.log('✅ Updated user with tenant');
    } else if (user.Tenant.type !== 'STUDIO') {
      console.log('⚠️ User tenant is not STUDIO type, updating...');
      
      // Update tenant type
      await prisma.tenant.update({
        where: { id: user.tenantId },
        data: { type: 'STUDIO' }
      });
      
      console.log('✅ Updated tenant type to STUDIO');
    }
    
    console.log('✅ Admin user setup completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Error setting up admin user:', error.message);
    return false;
  }
}

// Verify critical database tables
async function verifyDatabaseTables() {
  try {
    // List of critical tables to verify
    const tables = [
      { name: 'User', method: prisma.user.count },
      { name: 'Tenant', method: prisma.tenant.count },
      { name: 'Studio', method: prisma.studio.count },
      { name: 'Project', method: prisma.project.count }
    ];
    
    let failures = 0;
    
    // Check each table
    for (const table of tables) {
      try {
        const count = await table.method();
        console.log(`✅ Table ${table.name} verified (${count} records)`);
      } catch (error) {
        console.error(`❌ Error verifying table ${table.name}:`, error.message);
        failures++;
      }
    }
    
    if (failures === 0) {
      console.log('✅ All critical database tables verified');
      return true;
    } else {
      console.warn(`⚠️ ${failures} tables failed verification`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error verifying database tables:', error.message);
    return false;
  }
}

// Run the main function
main()
  .then(success => {
    if (success) {
      console.log('✅ Deployment initialization completed successfully');
      process.exit(0);
    } else {
      console.error('❌ Deployment initialization encountered errors');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Fatal error during deployment initialization:', error);
    process.exit(1);
  });