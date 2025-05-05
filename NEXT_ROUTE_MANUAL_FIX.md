# Next.js Route Conflict Manual Fix

## The Problem

The Next.js build was failing with this error:

```
Error: You cannot use different slug names for the same dynamic path ('id' !== 'projectId').
```

This happened because there were duplicate route files using different parameter names for the same routes:
- Some files used `/[id]/` in their paths
- Others used `/[projectId]/` in their paths

Next.js requires consistent parameter naming in routes, so it treats this as an error.

## The Solution

I manually removed all the conflicting files and directories:

1. Deleted these files:
   - `/src/app/studio/projects/[id]/page.tsx`
   - `/src/app/api/studio/projects/[id]/route.ts`

2. Removed these directories:
   - `/src/app/studio/projects/[id]`
   - `/src/app/api/studio/projects/[id]`

3. Simplified the deployment script to:
   ```
   "do:deploy-full": "npx prisma generate && NODE_ENV=production next build"
   ```

This ensures that only the `[projectId]` parameter is used throughout the codebase, maintaining consistency.

## Future Development Guidelines

To prevent this issue from happening again:

1. Always use `[projectId]` (not `[id]`) for project routes:
   - In page components: `export default function Page({ params }: { params: { projectId: string } })`
   - In API routes: `export async function GET(request: Request, { params }: { params: { projectId: string } })`

2. Maintain consistency in parameter naming across the codebase:
   - Use meaningful, specific parameter names that describe what they represent
   - Don't mix different parameter names for the same type of entity

## Deployment Instructions

No special steps are needed for deployment now. The standard deployment process will work:

```bash
# For DigitalOcean App Platform:
npm run do:deploy-full
```

The build should now complete successfully without the route conflict error.