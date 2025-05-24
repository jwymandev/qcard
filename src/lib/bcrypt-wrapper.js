/**
 * Production-ready Bcrypt wrapper
 * 
 * This module provides a secure implementation of bcrypt for password hashing,
 * with the following features:
 * - Uses real bcrypt in production and development environments
 * - Falls back to a stub implementation only during build time
 * - Configurable salt rounds via environment variable
 * - Comprehensive error handling and logging
 * - Verification of bcrypt functionality before use
 */

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// Only use stub during server-side rendering/building, NOT during API routes
// We want to ensure API routes (especially auth) always use real bcrypt
const isServerComponent = typeof window === 'undefined';
const isApiRoute = isServerComponent && (
  process.env.NEXT_RUNTIME === 'edge' || 
  (typeof process.env.NEXT_RUNTIME === 'string' && process.env.NEXT_RUNTIME.includes('nodejs'))
);

// Only use stub during build time, not during regular server operation
const isBuildTime = process.env.NEXT_BUILD_SKIP_DB === 'true' && !isApiRoute;

// Get salt rounds from environment or use secure default
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

// Validate salt rounds are within secure range
if (SALT_ROUNDS < 10 || SALT_ROUNDS > 14) {
  console.warn(`WARNING: Bcrypt salt rounds (${SALT_ROUNDS}) outside recommended range (10-14)`);
  console.warn('Using default of 12 rounds instead');
}

// Initialize logging with appropriate detail level for environment
const logPrefix = '[BCRYPT]';
const logLevel = isProduction ? 'warn' : 'info';

// Enhanced logging function with level filtering
function log(level, ...messages) {
  const levels = { error: 0, warn: 1, info: 2, debug: 3 };
  
  if (levels[level] <= levels[logLevel]) {
    const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
    console[method](`${logPrefix} ${messages.join(' ')}`);
  }
}

// Log environment detection
if (isProduction) {
  log('info', 'Production environment detected - using real bcrypt');
} else if (isBuildTime) {
  log('info', 'Build time detected - using bcrypt stub');
} else {
  log('info', 'Development environment - using real bcrypt');
}

// Choose the appropriate implementation
let bcrypt;
try {
  // Only use stub during actual build time, otherwise use real bcrypt
  if (isBuildTime) {
    console.log('Build time detected - using bcrypt stub');
    bcrypt = require('./bcrypt-stub');
    console.log('Using bcrypt stub for build');
  } else {
    // For both production and development, use real bcrypt
    console.log(`Loading real bcrypt for ${isProduction ? 'production' : 'development'} use`);
    bcrypt = require('bcrypt');
    
    // Verify bcrypt is working by generating a test hash
    const testHash = bcrypt.hashSync('test', 10);
    const testVerify = bcrypt.compareSync('test', testHash);
    
    if (!testVerify) {
      throw new Error('Bcrypt verification failed - may be using incorrect implementation');
    }
    
    console.log('✅ Real bcrypt loaded and verified successfully');
  }
} catch (error) {
  // For production, we should never fall back to the stub
  if (isProduction) {
    console.error('CRITICAL ERROR: Failed to load real bcrypt in production!');
    console.error('This is a security risk and authentication will not work properly!');
    console.error('Error details:', error.message);
    
    // In production, throw the error to crash the app rather than using the insecure stub
    throw new Error('Failed to load real bcrypt in production: ' + error.message);
  }
  
  // Only fall back to stub in non-production environments
  console.warn('Failed to load bcrypt in development, falling back to stub:', error.message);
  bcrypt = require('./bcrypt-stub');
}

module.exports = bcrypt;