/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.clerk.dev', 'img.clerk.com'],
  },
  // Remove custom webpack config as it's causing issues
};

module.exports = nextConfig;