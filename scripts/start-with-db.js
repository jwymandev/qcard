#!/usr/bin/env node

/**
 * Custom server script that:
 * 1. Sets up the database connection (including from individual params)
 * 2. Starts Next.js on the correct port
 */
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { execSync } = require('child_process');
const path = require('path');

// Function to construct DB URL from individual parameters
function getDatabaseUrl() {
  // If DATABASE_URL is already provided, use it
  if (process.env.DATABASE_URL) {
    // Check if the URL is a PostgreSQL URL
    if (process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://')) {
      console.log('Using provided DATABASE_URL');
      return process.env.DATABASE_URL;
    }
    
    // If it's a SQLite URL (for local development), return it as is
    if (process.env.DATABASE_URL.startsWith('file:')) {
      console.log('Using SQLite DATABASE_URL for local development');
      return process.env.DATABASE_URL;
    }
    
    console.warn('DATABASE_URL is not in a recognized format, attempting to construct from components');
  }
  
  // Check if we have the individual components
  if (!process.env.DATABASE_HOST) {
    console.warn('DATABASE_HOST is not set. Cannot construct PostgreSQL connection string.');
    
    // If no DATABASE_URL and no DATABASE_HOST, default to SQLite for local development
    if (!process.env.DATABASE_URL) {
      console.log('Defaulting to SQLite for local development');
      return "file:./prisma/dev.db";
    }
    
    return process.env.DATABASE_URL;
  }
  
  // Construct the URL from individual components
  const host = process.env.DATABASE_HOST;
  const port = process.env.DATABASE_PORT || '25060';
  const name = process.env.DATABASE_NAME || 'defaultdb';
  const username = process.env.DATABASE_USERNAME || 'doadmin';
  const password = process.env.DATABASE_PASSWORD || '';
  
  // Construct the URL with proper URL encoding for the password
  const encodedPassword = encodeURIComponent(password);
  
  // Verify database name is not being confused with host
  const databaseName = host.includes(name) || name.includes(host) ? 'defaultdb' : name;
  console.log(`Using database name: ${databaseName}`);
  
  // Add sslmode=require for DigitalOcean managed databases
  const url = `postgresql://${username}:${encodedPassword}@${host}:${port}/${databaseName}?sslmode=require`;
  console.log(`Constructed DATABASE_URL from components (host: ${host})`);
  return url;
}

// Set up the database URL
const dbUrl = getDatabaseUrl();
process.env.DATABASE_URL = dbUrl;

// Log database connection info (without credentials)
try {
  const url = new URL(dbUrl);
  console.log(`Database configuration: ${url.protocol}//${url.hostname}:${url.port}${url.pathname}`);
  
  if (url.protocol === 'postgresql:' || url.protocol === 'postgres:') {
    console.log('Using PostgreSQL database');
  } else if (url.protocol === 'file:') {
    console.log('Using SQLite database');
  } else {
    console.log(`Using database with protocol: ${url.protocol}`);
  }
} catch (e) {
  console.warn('Could not parse database URL:', e.message);
}

// Determine environment
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Get port from environment or use default (8080 for DO App Platform)
const port = parseInt(process.env.PORT || '8080', 10);

// Set NEXTAUTH_URL if it's not set
if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = process.env.NODE_ENV === 'production' 
    ? `https://${process.env.APP_HOSTNAME || 'localhost'}` 
    : `http://localhost:${port}`;
  console.log(`NEXTAUTH_URL set to ${process.env.NEXTAUTH_URL}`);
}

// Start Next.js
app.prepare().then(() => {
  console.log(`> Starting custom Next.js server on port ${port}`);
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});