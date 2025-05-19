# Edge Middleware URL Fix

This document explains the issues with URL handling in Next.js Edge Middleware and the solution implemented.

## Problem

When using relative URLs in the Edge Middleware environment, we encountered errors like:

```
[TypeError: Failed to parse URL from /api/studio/check-access]
```

This happens because:

1. Next.js Edge Middleware requires absolute URLs for fetch operations
2. Relative URLs (like `/api/route`) don't have enough context for the Edge Runtime to resolve them
3. Edge Runtime does not automatically inherit the base URL from the current request

## Solution

We've updated the middleware to construct absolute URLs by extracting the origin from the current request:

```typescript
// Get the origin (protocol + hostname + port) from the request
const url = new URL(request.url);
const origin = url.origin;

// Construct absolute URL for API call
const apiUrl = `${origin}/api/studio/check-access`;

// Make the request
const response = await fetch(apiUrl, {
  headers: { cookie: request.headers.get('cookie') || '' },
});
```

## Implementation Details

1. **Extraction of the Origin**:
   ```typescript
   const url = new URL(request.url);
   const origin = url.origin; // Gets protocol + hostname + port
   ```

2. **Construction of Absolute URLs**:
   ```typescript
   const apiUrl = `${origin}/api/studio/check-access`;
   ```

3. **Consistent Application**:
   - Applied to all fetch calls in middleware.ts
   - Applied to all fetch calls in middleware-subscription.ts
   - Added debug logging to track API request destinations

## Why This Works

This approach works because:

1. It uses the same origin as the incoming request, ensuring we call the correct host
2. It preserves the protocol (HTTP/HTTPS) from the original request
3. It meets Edge Runtime requirements for absolute URLs
4. It works consistently across all environments (localhost, staging, production)

## Edge Runtime Limitations

Next.js Edge Middleware runs in a specialized Edge Runtime that has several limitations:

1. It requires absolute URLs for fetch() operations
2. It doesn't support Node.js built-ins
3. It has a limited set of Web APIs available
4. It has execution time limits

For more information, refer to the Next.js documentation on Edge Runtime limitations.

## Testing

To verify the fix is working:

1. The app should no longer show "Failed to parse URL" errors in logs
2. Middleware should log messages like "Making API request to: https://domain.com/api/route"
3. Authentication and subscription checks should work correctly
4. All routes protected by the middleware should be accessible