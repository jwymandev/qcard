/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.clerk.dev', 'img.clerk.com'],
  },
  // Remove custom webpack config as it's causing issues
  
  // DigitalOcean deployment settings
  env: {
    PORT: process.env.PORT || '8080'
  },
  // Ensure we're listening on the right port for DigitalOcean
  serverRuntimeConfig: {
    port: parseInt(process.env.PORT || '8080', 10)
  },
  // Enable experimental features for port configuration
  experimental: {
    serverComponents: true
  }
};

module.exports = nextConfig;