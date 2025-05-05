# Next.js Route Conflict Fix Guide

## The Problem

The build is failing with this error:

```
Error: You cannot use different slug names for the same dynamic path ('id' !== 'projectId').
```

This happens because Next.js requires consistent parameter naming in dynamic routes. In our codebase, we have a mix of:
- `/studio/projects/[id]/...`
- `/studio/projects/[projectId]/...`

Next.js doesn't allow different parameter names (`id` vs `projectId`) for what it considers the same path segment.

## The Solution

We've provided a script that automatically cleans up conflicting route files:

```bash
node scripts/fix-nextjs-routes.js
```

This script deletes any route files/directories using `[id]` in project paths, ensuring that only `[projectId]` routes remain, which fixes the build issue.

### What Changes Were Made

1. Deleted all files and directories under:
   - `/src/app/studio/projects/[id]/...`
   - `/src/app/api/studio/projects/[id]/...` 

2. Kept all files using the `[projectId]` parameter:
   - `/src/app/studio/projects/[projectId]/...`
   - `/src/app/api/studio/projects/[projectId]/...`

## For Future Development

When working with project routes, always use `[projectId]` as the parameter name, not `[id]`.

For example:
```tsx
// Use this (correct)
export default function ProjectPage({ params }: { params: { projectId: string } }) {
  const { projectId } = params;
  // ...
}

// Not this (incorrect)
export default function ProjectPage({ params }: { params: { id: string } }) {
  const { id } = params;
  // ...
}
```

## Digital Ocean Deployment

The `do:deploy-full` script has been updated to run this fix automatically before building:

```
"do:deploy-full": "node scripts/fix-nextjs-routes.js && npx prisma generate && NODE_ENV=production next build"
```

No other changes to your Digital Ocean deployment configuration are needed.