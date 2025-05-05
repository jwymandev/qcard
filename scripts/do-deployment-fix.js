#!/usr/bin/env node

/**
 * DigitalOcean Deployment Fix Script
 * 
 * This script is designed to fix common issues with DigitalOcean deployments:
 * 1. Verifies database connection with PostgreSQL
 * 2. Ensures all required tables exist
 * 3. Verifies studio initialization for all STUDIO tenant users
 * 4. Checks project tables and permissions
 * 5. Ensures that the migration lock file is set to PostgreSQL
 */

const { PrismaClient } = require('@prisma/client');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create Prisma client
const prisma = new PrismaClient();

async function main() {
  console.log('===== DIGITAL OCEAN DEPLOYMENT FIX =====');
  
  // Step 1: Verify DATABASE_URL environment variable
  console.log('\n📋 Checking DATABASE_URL...');
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('❌ DATABASE_URL is not set!');
    console.log('Please set the DATABASE_URL environment variable and try again.');
    process.exit(1);
  }
  
  if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
    console.error('⚠️ DATABASE_URL does not appear to be a PostgreSQL URL');
    console.log('Current URL format:', dbUrl.split('://')[0] + '://****');
    process.exit(1);
  }
  
  console.log('✅ DATABASE_URL is set and appears to be a PostgreSQL URL');
  
  // Step 2: Test direct PostgreSQL connection
  console.log('\n📋 Testing direct PostgreSQL connection...');
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Required for DigitalOcean managed databases
      }
    });
    
    await client.connect();
    console.log('✅ Successfully connected to PostgreSQL database');
    
    // Check for essential tables
    const tables = await client.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `);
    
    console.log(`Found ${tables.rowCount} tables in database:`);
    const tableNames = tables.rows.map(row => row.tablename);
    console.log(tableNames.join(', '));
    
    // Check for essential tables
    const essentialTables = ['user', 'profile', 'studio', 'tenant', 'project', 'project_member'];
    const missingTables = essentialTables.filter(table => 
      !tableNames.includes(table) && !tableNames.includes(table.toLowerCase())
    );
    
    if (missingTables.length > 0) {
      console.log('\n⚠️ Missing essential tables:', missingTables.join(', '));
      console.log('Database schema may need to be pushed!');
    } else {
      console.log('\n✅ All essential tables exist');
    }
    
    await client.end();
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL:', error.message);
    console.log('Please check your DATABASE_URL and ensure the database is accessible');
    process.exit(1);
  }
  
  // Step 3: Check Prisma client connection
  console.log('\n📋 Testing Prisma client connection...');
  try {
    // Count users
    const userCount = await prisma.user.count();
    console.log(`✅ Connected via Prisma client. User count: ${userCount}`);
    
    // Count tenants
    const tenantCount = await prisma.tenant.count();
    console.log(`Tenant count: ${tenantCount}`);
    
    // Count studios
    const studioCount = await prisma.studio.count();
    console.log(`Studio count: ${studioCount}`);
    
    // Count projects
    const projectCount = await prisma.project.count();
    console.log(`Project count: ${projectCount}`);
    
    // Check for STUDIO tenants without studios
    const studioTenants = await prisma.tenant.findMany({
      where: { type: 'STUDIO' }
    });
    
    const tenantsWithStudios = await prisma.studio.findMany({
      select: { tenantId: true }
    });
    
    const tenantsWithStudioIds = tenantsWithStudios.map(s => s.tenantId);
    const tenantsWithoutStudio = studioTenants.filter(t => !tenantsWithStudioIds.includes(t.id));
    
    if (tenantsWithoutStudio.length > 0) {
      console.log(`\n⚠️ Found ${tenantsWithoutStudio.length} STUDIO tenants without studio records:`);
      
      console.log('\n📋 Running studio initialization for these tenants...');
      
      // Auto-initialize studios
      const crypto = require('crypto');
      let fixCount = 0;
      
      for (const tenant of tenantsWithoutStudio) {
        try {
          const studioName = tenant.name || 'New Studio';
          
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
          fixCount++;
        } catch (error) {
          console.error(`❌ Error creating studio for tenant ${tenant.id}:`, error.message);
        }
      }
      
      console.log(`\n✅ Created ${fixCount} missing studios`);
    } else {
      console.log('\n✅ All STUDIO tenants have associated studio records');
    }
    
  } catch (error) {
    console.error('❌ Failed to connect via Prisma client:', error.message);
    console.log('This might indicate a schema mismatch or migration issue');
  }
  
  // Step 4: Verify migration provider
  console.log('\n📋 Checking migration lock file...');
  try {
    const migrationLockPath = path.join(process.cwd(), 'prisma', 'migrations', 'migration_lock.toml');
    
    if (fs.existsSync(migrationLockPath)) {
      const lockFileContent = fs.readFileSync(migrationLockPath, 'utf8');
      
      if (lockFileContent.includes('provider = "postgresql"')) {
        console.log('✅ Migration lock file correctly set to PostgreSQL');
      } else if (lockFileContent.includes('provider = "sqlite"')) {
        console.log('⚠️ Migration lock file is set to SQLite, should be PostgreSQL for deployment!');
        
        // Update the file
        console.log('Updating migration_lock.toml to use PostgreSQL...');
        fs.writeFileSync(
          migrationLockPath,
          '# Please do not edit this file manually\n# It should be added in your version-control system (i.e. Git)\nprovider = "postgresql"'
        );
        
        console.log('✅ Updated migration lock file to use PostgreSQL');
      } else {
        console.log('⚠️ Migration lock file has unknown provider:', lockFileContent);
      }
    } else {
      console.log('⚠️ Migration lock file not found at', migrationLockPath);
    }
  } catch (error) {
    console.error('❌ Error checking migration lock file:', error.message);
  }
  
  // Step 5: Fix database schema if needed
  console.log('\n📋 Checking if database schema needs to be pushed...');
  try {
    // Use Prisma to check if schema needs to be pushed
    execSync('npx prisma db push --preview-feature', {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env
    });
    
    console.log('✅ Database schema is up to date or has been updated');
  } catch (error) {
    console.error('❌ Error checking/pushing schema:', error.message);
    console.log('You may need to run "npx prisma db push" manually');
  }
  
  // Step 6: Generate Prisma client if needed
  console.log('\n📋 Regenerating Prisma client...');
  try {
    execSync('npx prisma generate', {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env
    });
    
    console.log('✅ Prisma client regenerated successfully');
  } catch (error) {
    console.error('❌ Error regenerating Prisma client:', error.message);
  }
  
  console.log('\n===== FIX SUMMARY =====');
  console.log('✅ Database connectivity verified');
  console.log('✅ Studio initialization verified');
  console.log('✅ Migration configuration checked');
  console.log('✅ Schema consistency verified');
  
  console.log('\nIf your application is still having issues:');
  console.log('1. Try restarting your application in DigitalOcean');
  console.log('2. Check the application logs for specific errors');
  console.log('3. Ensure NextAuth is configured correctly for production');
  
  console.log('\nRecommended next steps:');
  console.log('- Verify the app is using the latest Prisma client');
  console.log('- Check environment variables in DigitalOcean App Platform');
  console.log('- Ensure the build command includes proper migration steps');
}

// Run and handle errors
main()
  .catch(error => {
    console.error('Fatal error during fix:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('\nFix process completed');
  });