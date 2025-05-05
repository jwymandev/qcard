#!/bin/bash
set -e

# Initialize a DigitalOcean PostgreSQL database with proper SSL settings
# This script helps you set up your database and apply migrations

echo "🌊 DigitalOcean PostgreSQL Database Initialization"
echo "This script will help you initialize your database with proper SSL settings"
echo ""

# Check if we have important env variables
if [ -z "$DATABASE_URL" ] && [ -z "$DATABASE_HOST" ]; then
  echo "❌ Error: Neither DATABASE_URL nor DATABASE_HOST is set"
  echo "Please provide database connection details by setting either:"
  echo "  - DATABASE_URL (full connection string)"
  echo "  - Or individual connection parameters (DATABASE_HOST, DATABASE_USERNAME, etc.)"
  exit 1
fi

# Function to build DATABASE_URL from individual parameters
build_database_url() {
  local host="${DATABASE_HOST:-localhost}"
  local port="${DATABASE_PORT:-25060}"
  local user="${DATABASE_USERNAME:-doadmin}"
  local pass="${DATABASE_PASSWORD:-}"
  local name="${DATABASE_NAME:-defaultdb}"
  
  # URL-encode the password
  local encoded_pass=$(node -e "console.log(encodeURIComponent('$pass'))")
  
  # Build the URL with SSL parameters
  echo "postgresql://$user:$encoded_pass@$host:$port/$name?sslmode=require&ssl=true"
}

# If DATABASE_URL is not set, build it from components
if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL=$(build_database_url)
  echo "📝 Built DATABASE_URL from environment variables"
else
  echo "📝 Using existing DATABASE_URL from environment"
fi

# Create a temporary .env file for this operation
echo "DATABASE_URL=\"$DATABASE_URL\"" > .env.do-temp
echo "NODE_TLS_REJECT_UNAUTHORIZED=0" >> .env.do-temp

# Source the temp env file
export $(grep -v '^#' .env.do-temp | xargs)
echo "✅ Environment configured"

# Test the database connection
echo "🔌 Testing database connection..."
node -e "
const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testConnection() {
  try {
    await client.connect();
    console.log('✅ Successfully connected to PostgreSQL database');
    const res = await client.query('SELECT version()');
    console.log('Database version:', res.rows[0].version);
    await client.end();
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }
}

testConnection();
"

# Create a wrapper script to disable SSL verification for future operations
echo "🛠️ Creating wrapper script for Prisma with SSL fix..."
cat > prisma-ssl-wrapper.js << 'EOF'
#!/usr/bin/env node

/**
 * Wrapper script to run Prisma commands with SSL verification disabled
 * Usage: node prisma-ssl-wrapper.js <prisma command> [args...]
 */

const { spawn } = require('child_process');
const path = require('path');

// Disable SSL certificate verification
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Get the Prisma command and arguments
const [, , command, ...args] = process.argv;

if (!command) {
  console.error('❌ No Prisma command specified');
  console.error('Usage: node prisma-ssl-wrapper.js <prisma command> [args...]');
  process.exit(1);
}

// Path to Prisma CLI
const prismaBin = path.join(process.cwd(), 'node_modules', '.bin', 'prisma');

// Run the Prisma command
const prismaProcess = spawn(prismaBin, [command, ...args], {
  stdio: 'inherit',
  env: process.env
});

// Handle process events
prismaProcess.on('error', (err) => {
  console.error('Failed to start Prisma process:', err);
  process.exit(1);
});

prismaProcess.on('close', (code) => {
  process.exit(code);
});
EOF

chmod +x prisma-ssl-wrapper.js

# Check if migrations directory exists
if [ -d "prisma/migrations" ]; then
  echo "📁 Found existing migrations directory"
  echo "🔄 Applying existing migrations..."
  node prisma-ssl-wrapper.js migrate deploy
else
  echo "📁 No migrations directory found"
  echo "🔄 Creating initial migration..."
  node prisma-ssl-wrapper.js migrate dev --name init
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
node prisma-ssl-wrapper.js generate

echo "✅ Database initialization completed successfully!"
echo ""
echo "Next steps:"
echo "1. Make sure to keep NODE_TLS_REJECT_UNAUTHORIZED=0 in your environment"
echo "2. Use the prisma-ssl-wrapper.js script for future Prisma commands:"
echo "   node prisma-ssl-wrapper.js <command> [args...]"
echo ""
echo "To permanently fix SSL issues, add these to your .env file:"
echo "DATABASE_URL=\"$DATABASE_URL\""
echo "NODE_TLS_REJECT_UNAUTHORIZED=0"

# Clean up temporary file
rm .env.do-temp