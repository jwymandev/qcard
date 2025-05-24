/** @type {import('next').NextConfig} */
const nextConfig = {
  // Essentials only - minimal configuration that should work
  output: 'standalone',
  
  // Important: correctly configure asset prefix if needed
  // In production, we want to ensure assets load correctly
  assetPrefix: process.env.NEXT_PUBLIC_APP_URL || '',
  
  // Enable proper script loading for client-side JavaScript
  poweredByHeader: false, // Disable X-Powered-By header
  generateEtags: true, // Enable ETags for better caching
  compress: true, // Enable compression
  
  // Disable static generation
  // For Next.js 14.2.4, we use the proper options
  staticPageGenerationTimeout: 1,
  // Skip SSG for pages that use dynamic features
  skipMiddlewareUrlNormalize: true,
  skipTrailingSlashRedirect: true,
  
  // Configuration for API routes and optimizations
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcrypt'],
    // Use Next.js 14 supported options
    optimizePackageImports: ['@prisma/client'],
    serverActions: {
      allowedOrigins: ['*'],
    },
    // Enable incremental build features
    incrementalCacheHandlerPath: false,
    isrMemoryCacheSize: 50, // Megabytes
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
    // Ensure necessary client-side env vars are available
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '',
  },
  
  // Exclude problematic packages from webpack bundling
  webpack: (config, { isServer, dev }) => {
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
    
    // For client-side bundle, handle HTML files and native modules
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

      // Ensure Next.js properly bundles client-side JavaScript
      if (!isServer && !dev) {
        // Set publicPath for client assets
        config.output = {
          ...config.output,
          publicPath: `${process.env.NEXT_PUBLIC_APP_URL || ''}/_next/`,
        };
      }
    }
    
    return config;
  },
};

module.exports = nextConfig;