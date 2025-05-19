# Database Schema Mismatch Fix

## Problem

You're experiencing a white screen issue after reverting your code to a previous version because your **database schema has already been migrated forward** and no longer matches the code.

This creates a situation where:
1. Your code expects an older database schema
2. But your database has newer migrations applied
3. Prisma can't properly map between the two

## Solutions

### Option 1: Update Your Code (Recommended)

The best solution is to get your code back in sync with your database:

```bash
# Option A: Pull the latest code
git pull origin main

# Option B: Return to a specific commit that works with your DB
git checkout [commit-hash]
```

### Option 2: Reset Your Database

If you need to keep your older code version, you can reset your database:

```bash
# WARNING: This deletes all data in your database!
# Make a backup first if you need to preserve data
npx prisma migrate reset
```

## Temporary Workaround

The code has been modified with emergency bypasses:

1. **Authentication Bypass Button**:
   - On the loading screen, wait 8 seconds for the "Emergency Bypass" button
   - Click this button to skip authentication checks

2. **URL Parameter Bypass**:
   - Add `?bypass_auth=true` to any URL to bypass authentication checks
   - Example: `http://localhost:3002/?bypass_auth=true`

3. **Debug Pages**:
   - `/db-mismatch` - Provides information about the mismatch
   - `/debug.html` - Static page with browser diagnostics
   - `/basic-debug` - Simple diagnostic page

## What Changed in the Database?

Looking at your migration history, these migrations have been applied:
- `20250513_add_qr_code_user_conversion` 
- `20250513_enhance_casting_calls`

These added new fields and models to your database that your reverted code doesn't know about.

## Technical Details

The code changes made to allow temporary access:

1. **AuthLoading Component**:
   - Added timeout detection and emergency bypass button
   - Displays loading timer to indicate when authentication is stuck
   
2. **Middleware**:
   - Simplified to allow access even with authentication failures
   - Added bypasses via URL parameters and cookies
   - Added detailed logging to help diagnose issues

3. **Added Debug Pages**:
   - Created static and server-rendered diagnostic pages
   - Added database mismatch information page

These changes are temporary and don't fix the core issue - you'll need to either update your code or reset your database for a permanent solution.