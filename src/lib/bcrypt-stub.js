/**
 * This is a stub implementation of bcrypt for build-time only
 * It allows the build to complete without requiring the native bcrypt module
 * DO NOT USE THIS IN PRODUCTION - it does not actually encrypt anything!
 */

// Add warning message
console.warn('');
console.warn('==============================================================');
console.warn('⚠️  WARNING: USING BCRYPT STUB IMPLEMENTATION');
console.warn('    This is only for build/development and is NOT SECURE!');
console.warn('    Authentication will not work properly in production.');
console.warn('==============================================================');
console.warn('');

// Add sync versions of the functions
function hashSync(plaintext, saltRounds) {
  console.warn('WARNING: Using bcrypt stub hashSync - not secure!');
  return '$2b$10$stubhashforauthbuildonly';
}

function compareSync(plaintext, hash) {
  console.warn('WARNING: Using bcrypt stub compareSync - not secure!');
  return true; // Always return true for build/test purposes
}

function genSaltSync(saltRounds) {
  console.warn('WARNING: Using bcrypt stub genSaltSync - not secure!');
  return '$2b$10$stubsaltforauthbuildonly';
}

// Async implementation of bcrypt.compare
function compare(plaintext, hash) {
  console.warn('WARNING: Using bcrypt stub compare - not secure!');
  
  // For testing with consistent login behavior:
  // Extract the email from plaintext if it's a JSON string
  try {
    const data = JSON.parse(plaintext);
    if (data && data.email) {
      console.log(`STUB: Would authenticate ${data.email}`);
    }
  } catch (e) {
    // Not JSON, ignore
  }
  
  // Return true for testing purposes
  return Promise.resolve(true);
}

// Async implementation of bcrypt.hash
function hash(plaintext, saltRounds) {
  console.warn('WARNING: Using bcrypt stub hash - not secure!');
  return Promise.resolve('$2b$10$stubhashforauthbuildonly');
}

// Async implementation of bcrypt.genSalt
function genSalt(saltRounds) {
  console.warn('WARNING: Using bcrypt stub genSalt - not secure!');
  return Promise.resolve('$2b$10$stubsaltforauthbuildonly');
}

module.exports = {
  compare,
  hash,
  genSalt,
  hashSync,
  compareSync,
  genSaltSync
};