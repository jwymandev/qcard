/**
 * Bcrypt wrapper that uses the real bcrypt in production but a stub during build
 * This avoids build failures in environments like Digital Ocean App Platform
 */

// Determine if we're in a build environment
const isBuildTime = process.env.NEXT_BUILD_SKIP_DB === 'true';

// Choose the appropriate implementation
let bcrypt;
try {
  if (isBuildTime) {
    // During build, use our stub
    bcrypt = require('./bcrypt-stub');
    console.log('Using bcrypt stub for build');
  } else {
    // In production, use real bcrypt
    bcrypt = require('bcrypt');
  }
} catch (error) {
  // Fallback to stub if real bcrypt fails to load
  console.warn('Failed to load bcrypt, falling back to stub:', error.message);
  bcrypt = require('./bcrypt-stub');
}

module.exports = bcrypt;