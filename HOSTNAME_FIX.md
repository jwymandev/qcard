# Hostname Resolution Fix for Edge Middleware

This document explains the issue with hostname resolution in Next.js Edge Middleware and the solution implemented.

## Problem

When using `new URL(request.url).origin` to construct API URLs in middleware, we discovered that the URL object was resolving to `localhost:8080` even when the application was running on a different domain (e.g., qcarddev.workflosoftware.com). This caused errors like:

```
Making API request to: https://localhost:8080/api/studio/check-access
Error: SSL routines:ssl3_get_record:wrong version number
```

This issue happens because:

1. In the Next.js deployment environment, internal URL objects may resolve differently than expected
2. The middleware receives a URL that doesn't accurately reflect the external domain
3. This results in API requests being sent to localhost instead of the actual domain

## Solution

We've updated the middleware to extract the hostname directly from the request headers instead of using the URL object:

```typescript
// Extract the host from the request headers, not the URL
const host = request.headers.get('host') || '';

// Determine protocol based on request URL
const protocol = request.url.startsWith('https') ? 'https' : 'http';

// Build the correct origin using host header
const origin = `${protocol}://${host}`;
const apiUrl = `${origin}/api/studio/check-access`;
```

## Implementation Details

1. **Using the Host Header**:
   ```typescript
   const host = request.headers.get('host') || '';
   ```
   
   The `host` header contains the domain name that the user used to access the application, which is the correct domain for API requests.

2. **Determining the Protocol**:
   ```typescript
   const protocol = request.url.startsWith('https') ? 'https' : 'http';
   ```
   
   We still use the request URL to determine whether to use HTTP or HTTPS.

3. **Building the Correct Origin**:
   ```typescript
   const origin = `${protocol}://${host}`;
   ```
   
   This combines the protocol with the host header to create the correct origin.

## Why This Works

This approach is more reliable because:

1. The `host` header is set by the client (browser) and reflects the actual domain name used
2. It works correctly in all environments including development, staging, and production
3. It preserves the correct protocol from the original request
4. It avoids the issue of internal URL resolution in the middleware environment

## Edge Cases Handled

1. **Protocol Detection**: We determine HTTP vs HTTPS based on the request URL
2. **Missing Host Header**: We fall back to an empty string if the host header is missing
3. **Logging**: We log both the constructed URL and the host header for debugging

## Testing

To verify the fix is working:

1. The logs should show the correct domain in messages like:
   ```
   Making API request to: https://qcarddev.workflosoftware.com/api/studio/check-access (host: qcarddev.workflosoftware.com)
   ```

2. The SSL "wrong version number" errors should no longer appear in the logs
3. The application should work correctly in the deployed environment