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
  // Use separate build directory for DO
  distDir: '.next-do',
  // Prevent static generation of API routes
  experimental: {
    // Don't attempt to statically generate API routes
    outputFileTracingExcludes: {
      '*': ['node_modules/@swc/**'],
    },
    // Skip rendering during build for dynamic routes
    skipTrailingSlashRedirect: true,
    // Avoid compiling API routes
    disableOptimizedLoading: true,
  },
  // Configure environment variables (excluding NODE_ENV as it's not allowed)
  env: {
    NEXT_BUILD_SKIP_DB: 'true',
    // Set a dummy database URL for build
    DATABASE_URL: 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
  },
  // Optimize build speed
  swcMinify: true,
  poweredByHeader: false,
  // Configure modules to be bundled properly
  transpilePackages: ['@prisma/client', 'bcrypt'],
  // Add webpack configuration to handle Node.js native modules
  webpack: (config, { isServer }) => {
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
    }
    
    return config;
  },
};

module.exports = nextConfig;