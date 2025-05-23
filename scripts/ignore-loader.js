/**
 * Simple ignore-loader implementation for webpack
 * This loader simply returns an empty module for any content it processes
 */

module.exports = function() {
  this.cacheable && this.cacheable();
  return 'module.exports = {};';
};