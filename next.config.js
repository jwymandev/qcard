/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.clerk.dev', 'img.clerk.com'],
  },
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
        dns: false
      };
    }
    return config;
  },
  
  // DigitalOcean deployment settings
  env: {
    PORT: process.env.PORT || '8080'
  },
  // Ensure we're listening on the right port for DigitalOcean
  serverRuntimeConfig: {
    port: parseInt(process.env.PORT || '8080', 10)
  },
  // Fix experimental flag - serverComponents is deprecated in newer Next.js
  experimental: {
    // Removed deprecated serverComponents
  }
};

module.exports = nextConfig;