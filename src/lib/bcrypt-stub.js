/**
 * This is a stub implementation of bcrypt for build-time only
 * It allows the build to complete without requiring the native bcrypt module
 * DO NOT USE THIS IN PRODUCTION - it does not actually encrypt anything!
 */

// Mock implementation of bcrypt.compare
function compare(plaintext, hash) {
  console.warn('WARNING: Using bcrypt stub implementation - not secure!');
  return Promise.resolve(false);
}

// Mock implementation of bcrypt.hash
function hash(plaintext, saltRounds) {
  console.warn('WARNING: Using bcrypt stub implementation - not secure!');
  return Promise.resolve('$2b$10$stubhashforauthbuildonly');
}

// Mock implementation of bcrypt.genSalt
function genSalt(saltRounds) {
  console.warn('WARNING: Using bcrypt stub implementation - not secure!');
  return Promise.resolve('$2b$10$stubsaltforauthbuildonly');
}

module.exports = {
  compare,
  hash,
  genSalt
};