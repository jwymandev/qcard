# Authentication Issues Fix Documentation

## Problems Identified

1. **NextAuth.js CSRF Token Errors**
   ```
   [auth][error] MissingCSRF: CSRF token was missing during an action callback.
   Read more at https://errors.authjs.dev#missingcsrf
   ```

2. **Module Loading Error After Login**
   ```
   Cannot find module './8948.js'
   ```

3. **Navigation and Routing Issues**
   - Dashboard and profile buttons not redirecting correctly
   - Development tools showing in production UI

## The Solution

1. **Added NEXTAUTH_SECRET to .env file**

   ```
   NEXTAUTH_SECRET=cd9f85c2f35dc8f7d9e6a9845fc2dfed765c7215e57e2ec8e661b7bd70fa6fb9
   ```

2. **Made secret required in auth configuration**

   ```typescript
   // In src/auth.ts
   export const { 
     handlers: { GET, POST },
     auth, 
     signIn, 
     signOut 
   } = NextAuth({
     // ... other options
     secret: process.env.NEXTAUTH_SECRET || "development-secret",
     trustHost: true,
     // ... other options
   });
   ```

3. **Simplified sign-in/sign-up code**

   Removed custom CSRF token handling and let NextAuth handle it internally.

4. **Fixed NEXTAUTH_URL in development**

   ```
   NEXTAUTH_URL=http://localhost:3001
   ```

5. **Added diagnostics endpoints**

   - Added `/api/auth-error/route.ts` for better error handling
   - Added `/api/auth/setup-check/route.ts` to verify configuration

6. **Fixed navigation component**

   Updated `src/components/navigation.tsx` to properly redirect to tenant-specific pages:

   ```typescript
   <Link
     href={session?.user?.tenantType === 'STUDIO' ? '/studio/dashboard' : '/talent/dashboard'}
     className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
       pathname.includes('/dashboard')
         ? 'border-blue-500 text-gray-900'
         : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
     }`}
   >
     Dashboard
   </Link>
   ```

7. **Simplified role redirect page** 

   The role-redirect page was simplified to use direct session data:

   ```typescript
   // Direct redirect based on session data
   if (session?.user?.tenantType === 'STUDIO') {
     console.log("User is studio, redirecting to studio dashboard");
     router.push('/studio/dashboard');
   } else {
     console.log("User is talent, redirecting to talent dashboard");
     router.push('/talent/dashboard');
   }
   ```

8. **Fixed module loading error**

   - Removed `.next` directory for a clean build
   - Updated schema fixing script to handle non-interactive runs
   - Fixed script to gracefully handle when no issues are found

9. **Fixed page reload loop**

   - Removed unnecessary `router.refresh()` after `router.push()` in sign-in page:
   ```typescript
   // Old code
   router.push('/role-redirect');
   router.refresh(); // This caused continuous reloads

   // New code
   router.push('/role-redirect');
   // Removed router.refresh() to prevent continuous reloads
   ```

   - Implemented useRef to prevent multiple redirects in role-redirect page:
   ```typescript
   // Create a persistent ref to track if we've already redirected
   const redirected = useRef(false);
  
   useEffect(() => {
     // Skip if loading or if we've already redirected
     if (status === 'loading' || redirected.current) return;
     
     // ... redirect logic ...
     
     // Mark as redirected to prevent additional redirects
     redirected.current = true;
     
     router.push('/dashboard/path');
   }, [status, session, router]);
   ```

10. **Eliminated unnecessary API calls**

   - Removed redundant API calls to check tenant type in dashboard pages:
   
   Old code in talent dashboard:
   ```typescript
   // Instead of using tenantType directly, we'll fetch the user's tenant type
   try {
     const response = await fetch('/api/debug-user');
     if (response.ok) {
       const userData = await response.json();
       if (userData.tenant?.type !== 'TALENT') {
         console.log("User is not a talent account, redirecting");
         router.push('/studio/dashboard');
         return;
       }
     }
   } catch (error) {
     console.error("Error checking user type:", error);
   }
   ```

   New code in talent dashboard:
   ```typescript
   // Check tenant type directly from the session
   if (session?.user?.tenantType !== 'TALENT') {
     console.log("User is not a talent account, redirecting");
     router.push('/studio/dashboard');
     return;
   }
   ```

   Similar changes were made in the studio dashboard to use session data directly.

## How to Verify the Fix

1. Ensure environment variables are set correctly:
   - `NEXTAUTH_SECRET` must be set to a strong random value
   - `NEXTAUTH_URL` should be set to the application URL (http://localhost:3001 in development)

2. Clean the build and rebuild:
   ```
   rm -rf .next
   npm run build
   npm run dev
   ```

3. Try logging in with valid credentials

4. Verify navigation between dashboard and profile pages

## Troubleshooting

If you still encounter authentication errors:

1. Make sure your .env file has the appropriate values
2. Check that cookies are being properly set
3. Try using a different browser or clearing cookies
4. Check the browser console for any NextAuth-related errors
5. Verify that the database has the correct user records and tenant associations

If you encounter module loading errors:

1. Clean the build directory: `rm -rf .next`
2. Clear the npm cache: `npm cache clean --force`
3. Reinstall dependencies: `rm -rf node_modules && npm install`
4. Rebuild the application: `npm run build`

## References

- [NextAuth.js Documentation](https://next-auth.js.org/configuration/options)
- [CSRF Error Details](https://errors.authjs.dev#missingcsrf)
- [NextAuth.js CSRF Protection](https://next-auth.js.org/security/csrf)