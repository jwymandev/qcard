/** @type {import('next').NextConfig} */
const nextConfig = {
  // Essentials only - minimal configuration that should work
  output: 'standalone',
  distDir: '.next-do',
  
  // Disable all static generation
  staticPageGenerationTimeout: 1,
  experimental: {
    disableStaticGeneration: true,
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
    DATABASE_URL: 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
  },
  
  // Exclude problematic packages from webpack bundling
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
      bcrypt: false,
      crypto: false,
      path: false,
    };
    
    return config;
  },
};

module.exports = nextConfig;