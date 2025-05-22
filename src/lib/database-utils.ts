/**
 * Production-grade database utilities for PostgreSQL connectivity
 * Handles environment adaptations and proper connection management
 */

// Type for database connection parameters
export interface DatabaseParameters {
  host: string;
  port: string | number;
  username: string;
  password: string;
  databaseName: string;
  ssl: boolean;
}

/**
 * Extracts database connection parameters from environment variables
 * Provides default values appropriate for DigitalOcean
 */
export function getDatabaseParameters(): DatabaseParameters {
  return {
    host: process.env.DATABASE_HOST || '',
    port: process.env.DATABASE_PORT || '25060',
    username: process.env.DATABASE_USERNAME || 'doadmin',
    password: process.env.DATABASE_PASSWORD || '',
    databaseName: process.env.DATABASE_NAME || 'defaultdb',
    ssl: true  // Default to SSL for production databases
  };
}

/**
 * Constructs a properly formatted PostgreSQL URL from individual parameters
 * Handles URL encoding and proper SSL configuration
 */
export function constructPostgresUrl(params: DatabaseParameters): string {
  // URL-encode the password to handle special characters
  const encodedPassword = encodeURIComponent(params.password);
  
  // Add SSL parameters if required
  const sslQueryParam = params.ssl ? '?sslmode=require' : '';
  
  // Construct and return the formatted URL
  return `postgresql://${params.username}:${encodedPassword}@${params.host}:${params.port}/${params.databaseName}${sslQueryParam}`;
}

/**
 * Determines the correct database URL based on environment
 * Handles both direct URL configuration and individual parameters
 */
export function getDatabaseUrl(): string {
  // Check if DATABASE_URL is already properly set for PostgreSQL
  if (process.env.DATABASE_URL?.startsWith('postgresql://') || 
      process.env.DATABASE_URL?.startsWith('postgres://')) {
    return process.env.DATABASE_URL;
  }
  
  // If we have the required database host parameter, construct a PostgreSQL URL
  if (process.env.DATABASE_HOST) {
    const params = getDatabaseParameters();
    return constructPostgresUrl(params);
  }
  
  // Last resort: return whatever DATABASE_URL is set to
  return process.env.DATABASE_URL || '';
}

/**
 * Ensures proper DATABASE_URL environment variable for Prisma
 * Production-grade implementation that handles edge cases
 * @returns true if successful, false if unable to set a valid URL
 */
export function ensureProperDatabaseUrl(): boolean {
  try {
    // Get appropriate database URL based on environment
    const url = getDatabaseUrl();
    
    // No URL available despite our best efforts
    if (!url) {
      console.error('CRITICAL DATABASE ERROR: Unable to determine database URL');
      return false;
    }
    
    // URL is for PostgreSQL but our schema requires PostgreSQL
    if (!url.startsWith('postgresql://') && !url.startsWith('postgres://') && 
        !url.startsWith('file:')) {
      console.error('CRITICAL DATABASE ERROR: Invalid database URL format');
      return false;
    }
    
    // Set the environment variable
    if (typeof process !== 'undefined' && process.env) {
      // During build time, we need to avoid setting process.env directly
      try {
        // For client components, we'll skip this assignment
        if (process.env.NEXT_BUILD_SKIP_DB === 'true') {
          console.log('Skipping DATABASE_URL assignment during build');
        } else {
          Object.defineProperty(process.env, 'DATABASE_URL', { value: url });
        }
      } catch (e) {
        console.error('Error setting DATABASE_URL:', e);
      }
    }
    
    // Log success (without credentials)
    try {
      if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
        const parsedUrl = new URL(url);
        console.log(`Database configured: PostgreSQL at ${parsedUrl.hostname}:${parsedUrl.port}${parsedUrl.pathname}`);
      } else {
        console.log(`Database configured: ${url.split(':')[0]}`);
      }
    } catch (e) {
      // Don't expose sensitive info even in error case
      console.log('Database configured with custom connection string');
    }
    
    return true;
  } catch (error) {
    console.error('CRITICAL DATABASE ERROR:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}