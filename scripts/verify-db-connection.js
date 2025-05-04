#!/usr/bin/env node

/**
 * Database connection verification script
 * Run this after deployment to verify the database connection is working
 */

const { PrismaClient } = require('@prisma/client');

// Add the same database URL fixing function used in the app
function fixDatabaseUrlForPrisma() {
  if (process.env.DATABASE_URL && 
      !process.env.DATABASE_URL.startsWith('postgresql://') &&
      !process.env.DATABASE_URL.startsWith('postgres://')) {
    
    console.log('⚠️ Non-PostgreSQL DATABASE_URL detected, checking for DO parameters...');
    
    if (process.env.DATABASE_HOST) {
      const host = process.env.DATABASE_HOST;
      const port = process.env.DATABASE_PORT || '25060';
      const username = process.env.DATABASE_USERNAME || 'doadmin';
      const password = process.env.DATABASE_PASSWORD || '';
      const dbName = process.env.DATABASE_NAME || 'defaultdb';
      
      const encodedPassword = encodeURIComponent(password);
      const postgresUrl = `postgresql://${username}:${encodedPassword}@${host}:${port}/${dbName}?sslmode=require`;
      
      process.env.DATABASE_URL = postgresUrl;
      console.log(`✅ Fixed DATABASE_URL: Now using PostgreSQL connection to ${host}`);
    } else {
      console.warn('⚠️ Schema requires PostgreSQL but no valid DATABASE_URL or connection parameters found');
    }
  }
}

async function main() {
  console.log('Verifying database connection...');
  
  // Fix DB URL if needed
  fixDatabaseUrlForPrisma();
  
  // Show what we're working with (safely)
  try {
    const dbUrlForLogging = process.env.DATABASE_URL || '';
    if (dbUrlForLogging.startsWith('postgresql://') || dbUrlForLogging.startsWith('postgres://')) {
      const url = new URL(dbUrlForLogging);
      console.log(`Database host: ${url.hostname}, DB name: ${url.pathname.replace('/', '')}`);
    } else if (dbUrlForLogging.startsWith('file:')) {
      console.log(`Database: SQLite (${dbUrlForLogging})`);
    } else {
      console.log('Database URL format unknown');
    }
  } catch (e) {
    console.warn('Could not parse database URL');
  }
  
  // Initialize Prisma client
  const prisma = new PrismaClient();
  
  try {
    // Connect to the database
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('✅ Successfully connected to database');
    
    // Try checking for some tables
    console.log('Checking database tables...');
    
    // Check User table
    try {
      const userCount = await prisma.user.count();
      console.log(`✅ User table exists with ${userCount} records`);
    } catch (e) {
      console.error('❌ Error accessing User table:', e.message);
    }
    
    // Check Profile table
    try {
      const profileCount = await prisma.profile.count();
      console.log(`✅ Profile table exists with ${profileCount} records`);
    } catch (e) {
      console.error('❌ Error accessing Profile table:', e.message);
    }
    
    // Check Studio table
    try {
      const studioCount = await prisma.studio.count();
      console.log(`✅ Studio table exists with ${studioCount} records`);
    } catch (e) {
      console.error('❌ Error accessing Studio table:', e.message);
    }
    
    console.log('Database verification complete');
  } catch (error) {
    console.error('❌ Error connecting to database:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();