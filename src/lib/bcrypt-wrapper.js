/**
 * Bcrypt wrapper that uses the real bcrypt in production but a stub during build
 * This avoids build failures in environments like Digital Ocean App Platform
 */

// In production, we must always use real bcrypt
// In build/development, we can use the stub
const isProduction = process.env.NODE_ENV === 'production';
const isBuildTime = !isProduction && process.env.NEXT_BUILD_SKIP_DB === 'true';

// Log the environment and bcrypt mode
if (isProduction) {
  console.log('Production environment detected - forcing real bcrypt use');
} else if (isBuildTime) {
  console.log('Build environment detected - using bcrypt stub');
} else {
  console.log('Development environment - using real bcrypt');
}

// Choose the appropriate implementation
let bcrypt;
try {
  if (isProduction) {
    // In production, ALWAYS use real bcrypt - if this fails, it should crash
    // so we know there's a problem rather than silently using the insecure stub
    console.log('Loading real bcrypt for production use');
    bcrypt = require('bcrypt');
    
    // Verify bcrypt is working by generating a test hash
    const testHash = bcrypt.hashSync('test', 10);
    const testVerify = bcrypt.compareSync('test', testHash);
    
    if (!testVerify) {
      throw new Error('Bcrypt verification failed - may be using incorrect implementation');
    }
    
    console.log('✅ Real bcrypt loaded and verified successfully');
  } else if (isBuildTime) {
    // During build, use our stub
    bcrypt = require('./bcrypt-stub');
    console.log('Using bcrypt stub for build');
  } else {
    // In development (not build time), try to use real bcrypt
    console.log('Loading real bcrypt for development');
    bcrypt = require('bcrypt');
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