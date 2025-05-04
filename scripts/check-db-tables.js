#!/usr/bin/env node

/**
 * Simple script to check if all required tables exist in the database
 * Use this to verify your database is properly set up
 */

const { PrismaClient } = require('@prisma/client');

// The core tables that should exist in a properly set up database
const CORE_TABLES = [
  'User',
  'Tenant',
  'Session',
  'Profile',
  'Studio',
  'Location',
  'Project'
];

async function main() {
  console.log('Checking database tables...');
  
  try {
    // Connect to database using Prisma
    const prisma = new PrismaClient();

    // Use raw query to get list of tables
    const tables = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;

    // Convert to simple array
    const tableNames = tables.map(t => t.tablename);
    console.log(`Found ${tableNames.length} tables in database`);
    
    // Check if all core tables exist
    let allTablesExist = true;
    const missingTables = [];
    
    for (const table of CORE_TABLES) {
      // PostgreSQL table names are lower-cased in system tables
      if (!tableNames.includes(table.toLowerCase())) {
        allTablesExist = false;
        missingTables.push(table);
      }
    }
    
    // Show results
    if (allTablesExist) {
      console.log('✅ All core tables exist in the database');
      console.log('\nTable counts:');
      
      // Show record counts for key tables
      const userCount = await prisma.user.count();
      console.log(`- User: ${userCount} records`);
      
      const profileCount = await prisma.profile.count();
      console.log(`- Profile: ${profileCount} records`);
      
      const studioCount = await prisma.studio.count();
      console.log(`- Studio: ${studioCount} records`);
      
      const sessionCount = await prisma.session.count();
      console.log(`- Session: ${sessionCount} records`);
      
    } else {
      console.error('❌ Some required tables are missing:');
      missingTables.forEach(table => {
        console.error(`- ${table}`);
      });
      console.error('\nYour database is not properly set up.');
      console.error('Please run the database reset script:');
      console.error('  node scripts/do-reset-db.js');
    }
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Error checking database tables:', error.message);
    console.error('\nMake sure your DATABASE_URL is correctly set and the database is accessible.');
    process.exit(1);
  }
}

main();