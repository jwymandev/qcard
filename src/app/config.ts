// Global configuration flags for Next.js settings
export const dynamicConfig = {
  // Force all pages to be server-side rendered by default
  // This fixes issues with Headers and Cookies access in API routes
  dynamic: 'force-dynamic',
  
  // Disable static generation of all pages by default
  // This fixes issues with API routes that use headers, cookies, etc.
  staticGeneration: false,
};