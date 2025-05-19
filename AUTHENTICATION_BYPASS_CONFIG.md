# Authentication Bypass Configuration

This document explains the emergency authentication bypass system added to resolve the "Loading Authentication..." issue caused by database schema mismatches.

## Overview

The system includes several components:

1. **Emergency middleware bypass**: Allows bypassing authentication checks via URL parameter
2. **Emergency logout page**: Clears all session cookies and local storage 
3. **Bypass login form**: Allows access without database authentication
4. **Fixed AuthLoading component**: Prevents hook-related errors and offers bypass options

## How to Use

### Option 1: Emergency Bypass Parameter

Add `?emergency_bypass=true` to any URL to bypass normal authentication:

```
https://your-app.com/dashboard?emergency_bypass=true
```

This will:
- Set a cookie to bypass authentication checks
- Allow access to normally protected pages
- Use simplified authentication logic that doesn't rely on database

### Option 2: Emergency Logout

If stuck on the loading screen, navigate to:

```
https://your-app.com/emergency-logout
```

This will:
- Clear all cookies and local storage
- Return you to the sign-in page with a fresh session

### Option 3: Emergency Sign-In

When using emergency bypass, you'll see a special sign-in form:

1. Go to `/sign-in?emergency_bypass=true`
2. Enter any email and name
3. Click "Emergency Access"

This creates temporary bypass cookies without checking the database.

## Implementation Details

### Files Modified:

- `/src/middleware.ts` - Updated to check for bypass parameter
- `/src/components/AuthLoading.tsx` - Fixed hook errors and added bypass options
- `/src/app/sign-in/[[...sign-in]]/page.tsx` - Added bypass mode
- `/src/app/sign-in/[[...sign-in]]/bypass-signin.tsx` - Created emergency form
- `/src/app/emergency-logout/page.tsx` - Added session clearing page

### Bypassing Logic

The bypass system works by:

1. Checking for `emergency_bypass=true` parameter in URLs
2. Setting `bypass_auth=true` cookie when detected
3. Allowing middleware to skip authentication checks when cookie is present
4. Using temporary user information stored in cookies instead of database

## Removing the Bypass

After fixing database issues:

1. Reset your database with proper schema
2. Create a proper admin user
3. Remove the `?emergency_bypass=true` from URLs
4. Visit `/emergency-logout` to clear any bypass cookies
5. Log in normally with your admin credentials

## Security Warning

This bypass system intentionally weakens security to allow access during database issues. It should:

- Only be used during database problems
- Be removed once normal authentication is restored
- Never be deployed to production environments without understanding the risks
- Only be accessible to administrators

**Always restore proper authentication as soon as possible.**