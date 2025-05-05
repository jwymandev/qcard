/**
 * Database connection helper that constructs a connection URL from individual parameters
 * This is useful for DigitalOcean deployments where the database connection is provided as individual parameters
 */

/**
 * Constructs a PostgreSQL connection URL from individual components
 * Falls back to DATABASE_URL environment variable if it exists
 */
export function getDatabaseUrl(): string {
  // If DATABASE_URL is already provided, use it
  if (process.env.DATABASE_URL) {
    // Check if the URL is a PostgreSQL URL
    if (process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://')) {
      return process.env.DATABASE_URL;
    }
    
    console.warn('DATABASE_URL is not in a recognized PostgreSQL format, attempting to construct from components');
  }
  
  // Otherwise, construct the URL from individual components
  const host = process.env.DATABASE_HOST || 'localhost';
  const port = process.env.DATABASE_PORT || '5432';
  const name = process.env.DATABASE_NAME || 'defaultdb';
  const username = process.env.DATABASE_USERNAME || 'postgres';
  const password = process.env.DATABASE_PASSWORD || '';
  
  // Construct the URL with proper URL encoding for the password
  // This ensures special characters in the password are handled correctly
  const encodedPassword = encodeURIComponent(password);
  
  // Verify database name is not the same as the host (common issue)
  const databaseName = host.includes(name) ? 'defaultdb' : name;
  
  // Add sslmode=require for DigitalOcean managed databases
  return `postgresql://${username}:${encodedPassword}@${host}:${port}/${databaseName}?sslmode=require`;
}

/**
 * Gets PostgreSQL connection options as an object
 * This can be used for direct pg client connections
 */
export function getConnectionOptions() {
  return {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    database: process.env.DATABASE_NAME || 'defaultdb',
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || '',
    ssl: {
      rejectUnauthorized: false // Required for DigitalOcean managed databases
    },
    connectionTimeoutMillis: 30000 // 30 seconds
  };
}