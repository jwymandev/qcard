/**
 * Database connection helper that constructs a connection URL from individual parameters
 * This is useful for DigitalOcean deployments where the database connection is provided as individual parameters
 */

/**
 * Constructs a PostgreSQL connection URL from individual components
 * Falls back to DATABASE_URL environment variable if it exists
 */
export function getDatabaseUrl(): string {
  // If DATABASE_URL is already provided, validate it
  if (process.env.DATABASE_URL) {
    // Check if the URL is a PostgreSQL URL
    if (process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://')) {
      // Check for placeholder/invalid values
      const isPlaceholder = process.env.DATABASE_URL.includes('placeholder') || 
                           process.env.DATABASE_URL.includes('localhost:5432') ||
                           process.env.DATABASE_URL.includes('your_') ||
                           process.env.DATABASE_URL.includes('example');
      
      if (isPlaceholder) {
        console.warn('DATABASE_URL contains placeholder values, attempting to construct from components');
      } else {
        // Log database connection info (without credentials)
        const sanitizedUrl = sanitizeDatabaseUrl(process.env.DATABASE_URL);
        console.log(`Using database connection from DATABASE_URL: ${sanitizedUrl}`);
        return process.env.DATABASE_URL;
      }
    } else {
      console.warn('DATABASE_URL is not in a recognized PostgreSQL format, attempting to construct from components');
    }
  } else {
    console.warn('DATABASE_URL environment variable is not set');
  }
  
  // Otherwise, construct the URL from individual components
  const host = process.env.DATABASE_HOST || 'localhost';
  const port = process.env.DATABASE_PORT || '5432';
  const name = process.env.DATABASE_NAME || 'defaultdb';
  const username = process.env.DATABASE_USERNAME || 'postgres';
  const password = process.env.DATABASE_PASSWORD || '';
  
  // Log database connection components (without password)
  console.log(`Database connection components:
  - Host: ${host}
  - Port: ${port}
  - Database: ${name}
  - Username: ${username}
  - Password: ${password ? '[SET]' : '[NOT SET]'}
  `);
  
  // Construct the URL with proper URL encoding for the password
  // This ensures special characters in the password are handled correctly
  const encodedPassword = encodeURIComponent(password);
  
  // Verify database name is not the same as the host (common issue)
  const databaseName = name === host ? 'defaultdb' : name;
  if (name === host) {
    console.warn(`Database name "${name}" matches host, using "defaultdb" instead`);
  }
  
  // For local development without SSL
  if (host === 'localhost' || host === '127.0.0.1') {
    const url = `postgresql://${username}:${encodedPassword}@${host}:${port}/${databaseName}`;
    console.log(`Using local database connection: postgresql://${username}:[REDACTED]@${host}:${port}/${databaseName}`);
    return url;
  }
  
  // Add sslmode=require for production/remote databases
  const url = `postgresql://${username}:${encodedPassword}@${host}:${port}/${databaseName}?sslmode=require`;
  console.log(`Using remote database with SSL: postgresql://${username}:[REDACTED]@${host}:${port}/${databaseName}?sslmode=require`);
  return url;
}

/**
 * Sanitizes a database URL to hide sensitive information for logging
 */
function sanitizeDatabaseUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    // Hide password
    parsedUrl.password = parsedUrl.password ? '[REDACTED]' : '';
    return parsedUrl.toString();
  } catch (e) {
    return '[Invalid URL format]';
  }
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