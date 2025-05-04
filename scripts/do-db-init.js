#!/usr/bin/env node

/**
 * Special database initialization script for DigitalOcean
 * This creates the database schema directly using SQL queries
 * Supports both DATABASE_URL and individual connection parameters
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

console.log('DigitalOcean PostgreSQL Initialization');

// Function to construct DB URL from individual parameters
function getDatabaseUrl() {
  // If DATABASE_URL is already provided, use it
  if (process.env.DATABASE_URL) {
    // Check if the URL is a PostgreSQL URL
    if (process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://')) {
      return process.env.DATABASE_URL;
    }
    
    console.warn('DATABASE_URL is not in a PostgreSQL format, attempting to construct from components');
  }
  
  // Otherwise, construct the URL from individual components
  const host = process.env.DATABASE_HOST || 'localhost';
  const port = process.env.DATABASE_PORT || '5432';
  const name = process.env.DATABASE_NAME || 'defaultdb';
  const username = process.env.DATABASE_USERNAME || 'postgres';
  const password = process.env.DATABASE_PASSWORD || '';
  
  // Construct the URL with proper URL encoding for the password
  const encodedPassword = encodeURIComponent(password);
  
  // Verify database name is not being confused with host
  const databaseName = host.includes(name) || name.includes(host) ? 'defaultdb' : name;
  console.log(`Using database name: ${databaseName}`);
  
  // Add sslmode=require for DigitalOcean managed databases
  return `postgresql://${username}:${encodedPassword}@${host}:${port}/${databaseName}?sslmode=require`;
}

// Function to get connection options as an object
function getConnectionOptions() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Required for DigitalOcean managed databases
      },
      connectionTimeoutMillis: 30000 // 30 seconds
    };
  }
  
  const host = process.env.DATABASE_HOST || 'localhost';
  const dbName = process.env.DATABASE_NAME || 'defaultdb';
  
  // Verify database name is not being confused with host
  const databaseName = host.includes(dbName) || dbName.includes(host) ? 'defaultdb' : dbName;
  
  return {
    host: host,
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    database: databaseName,
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || '',
    ssl: {
      rejectUnauthorized: false // Required for DigitalOcean managed databases
    },
    connectionTimeoutMillis: 30000 // 30 seconds
  };
}

// Get the database URL and log it (without credentials)
const dbUrl = getDatabaseUrl();
try {
  const url = new URL(dbUrl);
  console.log(`Database: ${url.hostname}:${url.port}${url.pathname}`);
} catch (e) {
  console.error('ERROR: Could not parse database URL:', e.message);
  process.exit(1);
}

// Create PostgreSQL client with options
const client = new Client(getConnectionOptions());

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