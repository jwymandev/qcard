/**
 * Build-Safe Database Utilities
 * 
 * These utilities are designed to work safely in both server and client contexts,
 * and during both build and runtime. They properly handle environment variables
 * and avoid direct assignments that could cause build errors.
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
 * Safely gets environment variable with fallback
 */
export function getEnvVar(name: string, fallback: string = ''): string {
  // Safely access environment variables
  if (typeof process !== 'undefined' && process.env && name in process.env) {
    return process.env[name] || fallback;
  }
  return fallback;
}

/**
 * Extracts database connection parameters from environment variables
 * Provides default values appropriate for DigitalOcean
 */
export function getDatabaseParameters(): DatabaseParameters {
  return {
    host: getEnvVar('DATABASE_HOST', ''),
    port: getEnvVar('DATABASE_PORT', '25060'),
    username: getEnvVar('DATABASE_USERNAME', 'doadmin'),
    password: getEnvVar('DATABASE_PASSWORD', ''),
    databaseName: getEnvVar('DATABASE_NAME', 'defaultdb'),
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
 * Does NOT modify process.env
 */
export function getDatabaseUrl(): string {
  // Check if we're in build mode
  const isBuildMode = getEnvVar('NEXT_BUILD_SKIP_DB') === 'true';
  
  // Use placeholder in build mode
  if (isBuildMode) {
    return 'postgresql://placeholder:placeholder@localhost:5432/placeholder';
  }
  
  // Check for existing DATABASE_URL
  const existingUrl = getEnvVar('DATABASE_URL', '');
  if (existingUrl && (
    existingUrl.startsWith('postgresql://') || 
    existingUrl.startsWith('postgres://')
  )) {
    return existingUrl;
  }
  
  // If we have the required database host parameter, construct a PostgreSQL URL
  const host = getEnvVar('DATABASE_HOST', '');
  if (host) {
    const params = getDatabaseParameters();
    return constructPostgresUrl(params);
  }
  
  // Last resort
  return existingUrl;
}

/**
 * Gets the database URL without modifying environment variables
 * Safe to use in both client and server components
 */
export function getSafeDatabaseUrl(): string {
  try {
    return getDatabaseUrl();
  } catch (error) {
    console.error('Error getting database URL:', error);
    return '';
  }
}

// Export for backward compatibility
export default {
  getDatabaseUrl,
  getSafeDatabaseUrl,
  constructPostgresUrl,
  getDatabaseParameters
};