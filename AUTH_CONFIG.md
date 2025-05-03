# Authentication Configuration Guide

This document explains how authentication is configured in the QCard application and provides troubleshooting steps for common auth-related issues.

## Environment Variables

The following environment variables are required for authentication to work properly:

```
# NextAuth configuration
NEXTAUTH_URL=https://your-domain.com  # Must match your deployment URL
NEXTAUTH_SECRET=your_secure_random_secret  # Used for signing JWTs
```

## Deployment Configuration

When deploying to DigitalOcean App Platform:

1. Add the following environment variables in your DigitalOcean App settings:
   - `NEXTAUTH_URL`: Set to your deployed app URL (e.g., `https://qcard.app`)
   - `NEXTAUTH_SECRET`: Generate a secure random string (e.g., using `openssl rand -base64 32`)

2. Make sure to run the deployment script which handles database migrations:
   ```
   ./scripts/deploy.sh
   ```

## Troubleshooting

### "Cannot parse action" errors

If you see errors like `UnknownAction: Cannot parse action at /api/auth/session`, check the following:

1. Ensure `NEXTAUTH_URL` is correctly set to match your deployed domain
2. Verify that the `dynamic = 'force-dynamic'` flag is present in your auth route files
3. Check that the NextAuth configuration in `src/auth.ts` doesn't include any invalid options

### Login Issues

If users cannot log in:

1. Check server logs for auth-related errors
2. Verify that database migrations have been applied correctly
3. Ensure the credentials provider is configured properly in `src/auth.ts`

## Authentication Flow

1. Users visit `/sign-in` which renders the `src/app/sign-in/[[...sign-in]]/page.tsx` component
2. Login credentials are submitted to `/api/auth/[...nextauth]/route.ts`
3. NextAuth handles authentication via `src/auth.ts` configuration
4. Upon successful login, users are redirected to the appropriate dashboard based on their role

## Additional Resources

- [NextAuth.js Documentation](https://next-auth.js.org/getting-started/introduction)
- [Next.js Authentication Guide](https://nextjs.org/docs/pages/building-your-application/authentication)