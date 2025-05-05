#!/usr/bin/env node

/**
 * This script helps set up a local PostgreSQL database for development
 * It creates the database, applies the schema, and verifies the setup
 */

const { execSync } = require('child_process');
const { Client } = require('pg');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Default PostgreSQL connection parameters
const DEFAULT_CONFIG = {
  host: 'localhost',
  port: '5432',
  user: 'postgres',
  password: 'postgres',
  database: 'qcard'
};

// Function to prompt user for input with a default value
function prompt(question, defaultValue) {
  return new Promise(resolve => {
    rl.question(`${question} (${defaultValue}): `, answer => {
      resolve(answer || defaultValue);
    });
  });
}

// Function to test database connection
async function testConnection(config) {
  const client = new Client({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: 'postgres' // Connect to default postgres database initially
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL server');
    
    // Get PostgreSQL version
    const result = await client.query('SELECT version()');
    console.log(`PostgreSQL version: ${result.rows[0].version.split(' ')[0]}`);
    
    await client.end();
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL server:', error.message);
    return false;
  }
}

// Function to create database if it doesn't exist
async function createDatabase(config) {
  const client = new Client({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: 'postgres' // Connect to default postgres database
  });

  try {
    await client.connect();
    
    // Check if database exists
    const result = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`, 
      [config.database]
    );
    
    if (result.rows.length === 0) {
      console.log(`Creating database '${config.database}'...`);
      await client.query(`CREATE DATABASE "${config.database}"`);
      console.log(`✅ Database '${config.database}' created successfully`);
    } else {
      console.log(`ℹ️ Database '${config.database}' already exists`);
    }
    
    await client.end();
    return true;
  } catch (error) {
    console.error('❌ Failed to create database:', error.message);
    await client.end();
    return false;
  }
}

// Function to update .env file with PostgreSQL connection string
function updateEnvFile(config) {
  const envPath = path.join(process.cwd(), '.env');
  const connectionString = `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`;
  
  try {
    // Check if .env file exists
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
      
      // Replace existing DATABASE_URL or add new one
      if (envContent.includes('DATABASE_URL=')) {
        envContent = envContent.replace(
          /DATABASE_URL=.*(\r?\n|$)/,
          `DATABASE_URL="${connectionString}"$1`
        );
      } else {
        envContent += `\n# Database\nDATABASE_URL="${connectionString}"\n`;
      }
    } else {
      envContent = `# Database\nDATABASE_URL="${connectionString}"\n`;
    }
    
    // Write updated content back to .env file
    fs.writeFileSync(envPath, envContent);
    console.log(`✅ Updated .env file with PostgreSQL connection string`);
    return true;
  } catch (error) {
    console.error('❌ Failed to update .env file:', error.message);
    return false;
  }
}

// Function to apply Prisma schema to database
function applyPrismaSchema() {
  try {
    console.log('Applying Prisma schema to database...');
    execSync('npx prisma db push', { stdio: 'inherit' });
    console.log('✅ Prisma schema applied successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to apply Prisma schema:', error.message);
    return false;
  }
}

// Function to verify database setup
async function verifyDatabaseSetup(config) {
  const client = new Client({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database
  });

  try {
    await client.connect();
    
    // Check if essential tables exist
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const tables = result.rows.map(row => row.table_name);
    console.log(`Found ${tables.length} tables in database:`);
    console.log(tables.join(', '));
    
    // Check for essential tables
    const essentialTables = ['user', 'profile', 'studio', 'tenant'];
    const missingTables = essentialTables.filter(table => !tables.includes(table));
    
    if (missingTables.length > 0) {
      console.warn(`⚠️ Some essential tables are missing: ${missingTables.join(', ')}`);
    } else {
      console.log('✅ All essential tables are present');
    }
    
    await client.end();
    return true;
  } catch (error) {
    console.error('❌ Failed to verify database setup:', error.message);
    await client.end();
    return false;
  }
}

// Main function
async function main() {
  console.log('🐘 PostgreSQL Local Development Setup');
  console.log('This script will help you set up a local PostgreSQL database for development');
  console.log('');
  
  // Prompt for PostgreSQL connection parameters
  const config = {
    host: await prompt('PostgreSQL host', DEFAULT_CONFIG.host),
    port: await prompt('PostgreSQL port', DEFAULT_CONFIG.port),
    user: await prompt('PostgreSQL user', DEFAULT_CONFIG.user),
    password: await prompt('PostgreSQL password', DEFAULT_CONFIG.password),
    database: await prompt('Database name', DEFAULT_CONFIG.database)
  };
  
  // Test connection to PostgreSQL server
  const connected = await testConnection(config);
  if (!connected) {
    console.error('Failed to connect to PostgreSQL server. Please check your connection parameters.');
    rl.close();
    process.exit(1);
  }
  
  // Create database if it doesn't exist
  const databaseCreated = await createDatabase(config);
  if (!databaseCreated) {
    console.error('Failed to create database. Please check your PostgreSQL user permissions.');
    rl.close();
    process.exit(1);
  }
  
  // Update .env file with PostgreSQL connection string
  updateEnvFile(config);
  
  // Apply Prisma schema to database
  const schemaApplied = applyPrismaSchema();
  if (!schemaApplied) {
    console.error('Failed to apply Prisma schema. Please check the error message above.');
    rl.close();
    process.exit(1);
  }
  
  // Verify database setup
  await verifyDatabaseSetup(config);
  
  console.log('');
  console.log('✅ PostgreSQL development setup complete!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Start your development server with: npm run dev');
  console.log('2. Visit http://localhost:3001 in your browser');
  
  rl.close();
}

main().catch(error => {
  console.error('Unexpected error:', error);
  rl.close();
  process.exit(1);
});