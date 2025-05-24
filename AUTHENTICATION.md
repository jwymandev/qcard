# Authentication System Documentation

## Overview
This document explains the authentication system used in the QCard application, including the emergency authentication mode and how to transition back to normal authentication once database issues are resolved.

## Current Authentication Flow

The authentication system has been designed with resilience in mind, including:

1. **Normal Authentication Flow**
   - Users register through the standard signup process
   - Login using email/password credentials
   - Passwords are hashed using bcrypt
   - Authentication is managed through NextAuth.js

2. **Emergency Authentication Mode**
   - Provides a fallback when database issues occur
   - Allows any user to log in during development or when explicitly enabled
   - Can be enabled/disabled using environment variables

## Configuration Options

The following environment variable controls authentication behavior:

```
# Enable emergency authentication mode (allows anyone to log in)
ENABLE_EMERGENCY_AUTH=false
```

## Transitioning from Emergency Mode to Normal Authentication

To transition back to normal authentication once database issues are resolved:

1. **First ensure all database issues are fixed:**
   - Verify database connections are stable
   - Confirm user records are properly saved and retrievable
   - Test password hashing and verification

2. **Gradual Transition Steps:**
   
   a. **Step 1: Test normal authentication in parallel**
   - Set `ENABLE_EMERGENCY_AUTH=true`
   - Test normal authentication while having emergency mode as fallback
   - Monitor logs for database connection issues

   b. **Step 2: Disable emergency authentication for new users**
   - Update environment to set `ENABLE_EMERGENCY_AUTH=false` 
   - Verify new users can register and login normally

   c. **Step 3: Full transition**
   - Ensure `ENABLE_EMERGENCY_AUTH=false` is set in all environments
   - Remove all emergency auth code from the codebase

## Troubleshooting

If authentication issues persist:

1. Check database connectivity:
   ```
   prisma db execute --stdin < scripts/list-tables.sql
   ```

2. Verify user records:
   ```
   node scripts/check-user-role.js <email>
   ```

3. Reset a user's password:
   ```
   node scripts/dev-reset-password.js <email> <new-password>
   ```

## Security Considerations

- The emergency authentication mode is only intended for development and temporary production fixes
- Never deploy with emergency auth enabled in a long-term production environment
- Always rotate the `NEXTAUTH_SECRET` after disabling emergency authentication
- Consider implementing multi-factor authentication for additional security once normal auth is stable