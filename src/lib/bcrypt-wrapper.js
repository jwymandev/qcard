/**
 * Bcrypt wrapper that uses the real bcrypt in production but a stub during build
 * This avoids build failures in environments like Digital Ocean App Platform
 */

// Determine if we're in a build environment
// IMPORTANT: This should only be true during build, never in production
const isBuildTime = process.env.NEXT_BUILD_SKIP_DB === 'true';

// Choose the appropriate implementation
let bcrypt;
try {
  if (isBuildTime) {
    // During build, use our stub
    bcrypt = require('./bcrypt-stub');
    console.log('Using bcrypt stub for build');
  } else {
    // In production, always try to use real bcrypt
    console.log('Loading real bcrypt for production use');
    bcrypt = require('bcrypt');
  }
} catch (error) {
  // Fallback to stub if real bcrypt fails to load
  console.warn('Failed to load bcrypt, falling back to stub:', error.message);
  bcrypt = require('./bcrypt-stub');
  
  // In production, if we're falling back to stub, log a critical error
  if (!isBuildTime) {
    console.error('CRITICAL ERROR: Using bcrypt stub in production!');
    console.error('This is a security risk and authentication will not work properly!');
    console.error('Please ensure the bcrypt module is properly installed.');
  }
}

module.exports = bcrypt;