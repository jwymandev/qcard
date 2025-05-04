#!/usr/bin/env node

/**
 * Special database initialization script for DigitalOcean
 * This creates the database schema directly using SQL queries
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

console.log('DigitalOcean PostgreSQL Initialization');

// Parse DATABASE_URL (log without credentials)
try {
  const dbUrl = process.env.DATABASE_URL || '';
  const url = new URL(dbUrl);
  console.log(`Database: ${url.hostname}:${url.port}${url.pathname}`);
  
  if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
    console.error('ERROR: DATABASE_URL must start with postgresql:// or postgres://');
    process.exit(1);
  }
} catch (e) {
  console.error('ERROR: Could not parse DATABASE_URL. Make sure it is set correctly.');
  process.exit(1);
}

// Create PostgreSQL client
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for DigitalOcean managed databases
  },
  connectionTimeoutMillis: 30000, // 30 seconds
});

async function main() {
  try {
    console.log('Connecting to PostgreSQL...');
    await client.connect();
    console.log('Connected successfully to PostgreSQL');

    // Create tables for essential models
    console.log('Creating base schema...');
    
    // User table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT PRIMARY KEY,
        "email" TEXT UNIQUE NOT NULL,
        "password" TEXT,
        "firstName" TEXT,
        "lastName" TEXT,
        "role" TEXT NOT NULL DEFAULT 'USER',
        "tenantId" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL
      );
    `);
    
    // Tenant table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Tenant" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL
      );
    `);
    
    // Add foreign key
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'User_tenantId_fkey'
        ) THEN
          ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" 
          FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL;
        END IF;
      END
      $$;
    `);
    
    // Session table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Session" (
        "id" TEXT PRIMARY KEY,
        "sessionToken" TEXT UNIQUE NOT NULL,
        "userId" TEXT NOT NULL,
        "expires" TIMESTAMP NOT NULL,
        CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
      );
    `);

    console.log('Base schema created successfully');
    
    // Checking if schema creation worked
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('Tables created:');
    tableCheck.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    
    console.log('Database initialization complete');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(console.error);