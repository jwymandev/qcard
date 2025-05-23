/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.clerk.dev', 'img.clerk.com'],
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Use standalone output for DigitalOcean App Platform
  output: 'standalone',
  // Disable static page generation completely
  distDir: '.next-do',
  // Configure environment variables
  env: {
    NEXT_BUILD_SKIP_DB: 'true',
    // Set a dummy database URL for build
    DATABASE_URL: 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
  },
  // Optimize build speed
  swcMinify: true,
  poweredByHeader: false,
  // Webpack configuration
  webpack: (config) => {
    if (!config.resolve) {
      config.resolve = {};
    }
    
    if (!config.resolve.fallback) {
      config.resolve.fallback = {};
    }
    
    // Exclude server-only modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      path: false,
      os: false,
      stream: false,
      http: false,
      https: false,
      zlib: false,
      child_process: false,
      dns: false,
      async_hooks: false,
      'bcrypt': false,
      '@mapbox/node-pre-gyp': false,
      'mock-aws-s3': false,
      'aws-sdk': false,
      'nock': false
    };
    
    // Exclude HTML files from webpack loading
    if (!config.module) {
      config.module = { rules: [] };
    }
    
    config.module.rules.push({
      test: /\.html$/,
      use: 'null-loader'
    });
    
    return config;
  },
};

module.exports = nextConfig;