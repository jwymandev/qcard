/**
 * This file exports a special loader for handling HTML files in the webpack build process
 * It will be used by Next.js during the build in Digital Ocean
 */

// This function returns an empty object for any HTML imports
module.exports = function(source) {
  // This is a webpack loader that returns an empty module for HTML files
  this.cacheable && this.cacheable();
  return 'module.exports = {};';
};