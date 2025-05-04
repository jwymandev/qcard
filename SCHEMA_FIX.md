# Schema Case Sensitivity Fixes Guide

This document outlines the common issues found in the codebase related to Prisma schema case sensitivity and error handling, and provides guidance on how to fix them.

## Common Issues

1. **Prisma Model Case Sensitivity**:
   - In Prisma queries, model names should be lowercase (`prisma.user` not `prisma.User`)
   - For relation fields in `include` statements, use lowercase (`user`, `tenant`, etc.)
   - This affects most API routes in the project

2. **Unsafe Error Handling**:
   - Many catch blocks access error properties without checking the error type
   - This can lead to runtime errors if the error isn't an Error object

## How to Fix

### Prisma Model Case Sensitivity

Change all Prisma model references to use lowercase:

```typescript
// INCORRECT
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: { Tenant: true, Profile: true }
});

// CORRECT
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: { tenant: true, profile: true }
});
```

Also fix references to relation properties:

```typescript
// INCORRECT
const members = project.ProjectMember?.map(member => ({
  profile: member.Profile,
  user: member.Profile?.User
}));

// CORRECT
const members = project.projectMember?.map(member => ({
  profile: member.profile,
  user: member.profile?.user
}));
```

### Safe Error Handling

Use this pattern for all catch blocks:

```typescript
try {
  // Code that might throw
} catch (error) {
  console.error("Operation failed:", error);
  return NextResponse.json({ 
    error: "Failed to perform operation",
    details: error instanceof Error ? error.message : String(error),
    stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
  }, { status: 500 });
}
```

## Common Model Names to Fix

Here are the model names that need to be changed from uppercase to lowercase:

1. `User` → `user`
2. `Tenant` → `tenant`
3. `Profile` → `profile`
4. `Skill` → `skill`
5. `Location` → `location`
6. `Project` → `project`
7. `ProjectMember` → `projectMember`
8. `CastingCall` → `castingCall`
9. `Application` → `application`
10. `Studio` → `studio`
11. `ProfileImage` → `profileImage`
12. `Payment` → `payment`

## How to Test

After fixing these issues:

1. Run `npm run typecheck` to verify TypeScript is happy
2. Run `npm run validate` to validate the entire project
3. Run `npm run find-case-issues` to find any remaining case issues

These fixes should allow the application to deploy successfully to DigitalOcean.