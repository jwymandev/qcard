/** @type {import('next').NextConfig} */
const nextConfig = {
  // Essentials only - minimal configuration that should work
  output: 'standalone',
  distDir: '.next-do',
  
  // Disable static generation
  // For Next.js 14.2.4, we use the proper options
  staticPageGenerationTimeout: 1,
  // Skip SSG for pages that use dynamic features
  skipMiddlewareUrlNormalize: true,
  skipTrailingSlashRedirect: true,
  
  // Configuration for API routes
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcrypt'],
    // Use Next.js 14 supported options
    optimizePackageImports: ['@prisma/client'],
    serverActions: {
      allowedOrigins: ['*'],
    },
  },
  
  // Ignore errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Set environment variables
  env: {
    NEXT_BUILD_SKIP_DB: 'true',
    SKIP_API_ROUTES: 'true',
    NEXT_PUBLIC_SKIP_API_ROUTES: 'true',
    DATABASE_URL: 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
  },
  
  // Exclude problematic packages from webpack bundling
  webpack: (config, { isServer }) => {
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
      bcrypt: false,
      crypto: false,
      path: false,
      net: false,
      tls: false,
      dns: false,
      child_process: false,
    };
    
    // For API routes with headers, we need to handle HTML files
    if (!isServer) {
      config.module = config.module || {};
      config.module.rules = config.module.rules || [];
      
      // Add a rule to handle HTML files (for node-pre-gyp)
      config.module.rules.push({
        test: /\.html$/,
        use: 'ignore-loader',
      });
      
      // Handle native modules
      config.module.rules.push({
        test: /node_modules\/(@mapbox\/node-pre-gyp|bcrypt|aws-sdk|nock|mock-aws-s3)/,
        use: 'null-loader',
      });
    }
    
    return config;
  },
};

module.exports = nextConfig;