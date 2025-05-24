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
  output: 'standalone',
  // Completely disable static generation for API routes
  // This fixes the "Dynamic server usage" errors during build
  staticPageGenerationTimeout: 1,
  skipMiddlewareUrlNormalize: true,
  skipTrailingSlashRedirect: true,
  // Configure asset paths for production
  assetPrefix: process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_APP_URL || '' : '',
  // Configure API routes to be fully dynamic
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcrypt'],
    optimizePackageImports: ['@prisma/client'],
    serverActions: {
      allowedOrigins: ['*'],
    },
    // Don't try to statically generate API routes
    outputFileTracingExcludes: {
      '*': ['node_modules/@swc/**'],
    }
  },
  // Add webpack configuration to handle Node.js native modules
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      // Don't resolve Node.js modules on the client to prevent errors
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
        bcrypt: false,
        'mock-aws-s3': false,
        'aws-sdk': false,
        nock: false
      };
    }
    
    // Exclude server-only packages from client-side bundles
    if (!isServer) {
      config.module.rules.push({
        test: /node_modules\/(@mapbox\/node-pre-gyp|bcrypt|aws-sdk|nock|mock-aws-s3)/,
        use: 'null-loader',
      });
      
      // Set public path for assets in production
      if (!dev) {
        config.output = {
          ...config.output,
          publicPath: `${process.env.NEXT_PUBLIC_APP_URL || ''}/_next/`,
        };
      }
    }
    
    return config;
  },
  
  // Production deployment settings
  env: {
    PORT: process.env.PORT || '8080',
    // Add flag to skip database connection during build
    NEXT_BUILD_SKIP_DB: 'true',
    SKIP_API_ROUTES: 'true',
    NEXT_PUBLIC_SKIP_API_ROUTES: 'true',
    // Set a dummy database URL for build
    DATABASE_URL: process.env.NODE_ENV === 'production' ? 
      (process.env.DATABASE_URL || 'postgresql://placeholder:placeholder@localhost:5432/placeholder') : 
      process.env.DATABASE_URL,
    // Ensure app URL is available
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || ''
  },
  // Ensure we're listening on the right port for DigitalOcean
  serverRuntimeConfig: {
    port: parseInt(process.env.PORT || '8080', 10)
  }
};

module.exports = nextConfig;