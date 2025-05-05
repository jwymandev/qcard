#!/usr/bin/env node

/**
 * Digital Ocean Database Setup Script
 * 
 * This script is specifically designed for Digital Ocean deployments where
 * individual database connection parameters are provided instead of a full DATABASE_URL.
 * 
 * It will:
 * 1. Construct DATABASE_URL from individual parameters
 * 2. Apply database migrations
 * 3. Initialize studios for all studio tenants
 */

const { execSync, spawnSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

// Setup database URL from individual connection parameters
function setupDatabaseUrl() {
  if (process.env.DATABASE_HOST) {
    console.log('Constructing DATABASE_URL from Digital Ocean environment variables...');
    
    // Get raw values before processing
    const hostRaw = process.env.DATABASE_HOST || '';
    const portRaw = process.env.DATABASE_PORT || '25060';
    const usernameRaw = process.env.DATABASE_USERNAME || 'doadmin';
    const passwordRaw = process.env.DATABASE_PASSWORD || '';
    const dbNameRaw = process.env.DATABASE_NAME || 'defaultdb';
    
    // Check if values contain Digital Ocean placeholders and provide defaults
    const host = hostRaw.includes('${') ? 'localhost' : hostRaw;
    const port = portRaw.includes('${') ? '25060' : portRaw;
    const username = usernameRaw.includes('${') ? 'doadmin' : usernameRaw;
    const password = passwordRaw.includes('${') ? '' : passwordRaw;
    const dbName = dbNameRaw.includes('${') ? 'defaultdb' : dbNameRaw;
    
    console.log(`Database connection info:`);
    console.log(`- Host: ${host} (raw: ${hostRaw})`);
    console.log(`- Port: ${port} (raw: ${portRaw})`);
    console.log(`- Database: ${dbName} (raw: ${dbNameRaw})`);
    
    // Encode password for URL
    const encodedPassword = encodeURIComponent(password);
    
    // Construct PostgreSQL URL with SSL enabled
    const dbUrl = `postgresql://${username}:${encodedPassword}@${host}:${port}/${dbName}?sslmode=require`;
    
    // Set environment variable
    process.env.DATABASE_URL = dbUrl;
    console.log(`✅ Set DATABASE_URL to PostgreSQL connection (host: ${host})`);
    return true;
  } else if (process.env.DATABASE_URL) {
    console.log('✅ Using existing DATABASE_URL');
    return true;
  } else {
    console.error('❌ No database connection parameters found');
    console.log('Please set DATABASE_HOST, DATABASE_PORT, DATABASE_USERNAME, DATABASE_PASSWORD, and DATABASE_NAME');
    return false;
  }
}

// Apply Prisma migrations
async function applyMigrations() {
  try {
    console.log('\n📋 Applying database migrations...');
    
    const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
      stdio: 'inherit',
      env: process.env
    });
    
    if (result.status === 0) {
      console.log('✅ Migrations applied successfully');
      return true;
    } else {
      console.error('⚠️ Migration apply failed, trying schema push as fallback...');
      
      // Try schema push as fallback
      const pushResult = spawnSync('npx', ['prisma', 'db', 'push'], {
        stdio: 'inherit',
        env: process.env
      });
      
      if (pushResult.status === 0) {
        console.log('✅ Schema pushed successfully');
        return true;
      } else {
        console.error('❌ Schema push failed');
        return false;
      }
    }
  } catch (error) {
    console.error('❌ Error applying migrations:', error.message);
    return false;
  }
}

// Initialize studios for tenants
async function initializeStudios() {
  let prisma;
  
  try {
    console.log('\n📋 Initializing studios for STUDIO tenants...');
    prisma = new PrismaClient();
    
    // Find all STUDIO tenants
    const studioTenants = await prisma.tenant.findMany({
      where: { type: 'STUDIO' }
    });
    
    console.log(`Found ${studioTenants.length} STUDIO type tenants`);
    
    if (studioTenants.length === 0) {
      console.log('No studio tenants found. Skipping initialization.');
      return true;
    }
    
    // Get all studio records
    const studios = await prisma.studio.findMany();
    const studioTenantIds = studios.map(studio => studio.tenantId);
    
    // Find tenants without studios
    const tenantsWithoutStudios = studioTenants.filter(tenant => 
      !studioTenantIds.includes(tenant.id)
    );
    
    console.log(`Found ${tenantsWithoutStudios.length} tenants without studios`);
    
    // Create studios for each tenant without one
    let success = 0;
    
    for (const tenant of tenantsWithoutStudios) {
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
        success++;
      } catch (error) {
        console.error(`❌ Error creating studio for tenant ${tenant.id}:`, error.message);
      }
    }
    
    console.log(`✅ Created ${success} out of ${tenantsWithoutStudios.length} missing studios`);
    return true;
  } catch (error) {
    console.error('❌ Error initializing studios:', error.message);
    return false;
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}

// Generate Prisma client
async function generatePrismaClient() {
  try {
    console.log('\n📋 Generating Prisma client...');
    
    const result = spawnSync('npx', ['prisma', 'generate'], {
      stdio: 'inherit',
      env: process.env
    });
    
    if (result.status === 0) {
      console.log('✅ Prisma client generated successfully');
      return true;
    } else {
      console.error('❌ Failed to generate Prisma client');
      return false;
    }
  } catch (error) {
    console.error('❌ Error generating Prisma client:', error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log('=== DIGITAL OCEAN DATABASE SETUP ===');
  
  // Step 1: Setup database URL
  const databaseUrlConfigured = setupDatabaseUrl();
  if (!databaseUrlConfigured) {
    process.exit(1);
  }
  
  // Step 2: Apply migrations
  const migrationsApplied = await applyMigrations();
  
  // Step 3: Generate Prisma client
  const clientGenerated = await generatePrismaClient();
  
  // Step 4: Initialize studios
  if (migrationsApplied && clientGenerated) {
    await initializeStudios();
  }
  
  console.log('\n=== DIGITAL OCEAN DATABASE SETUP COMPLETED ===');
}

// Run the main function
main()
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });