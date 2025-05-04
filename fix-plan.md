# Systematic Plan to Fix Case Sensitivity Issues

## Issue Summary
The codebase has case sensitivity issues with Prisma model references:
1. Uppercase model names in include statements (`Tenant` instead of `tenant`)
2. Uppercase property references in the code (`.User` instead of `.user`)

## Fix Approach

### 1. API Routes Requiring Fixes

Based on the scans, these files need updates (among others):
1. `/src/app/api/studio/profile/route.ts`
2. `/src/app/api/studio/messages/route.ts`
3. `/src/app/api/studio/projects/*/route.ts` files
4. `/src/app/api/studio/casting-calls/*/route.ts` files
5. `/src/app/api/user/*/route.ts` files

### 2. Types of Fixes Needed

#### A. Include Statement Fixes
```typescript
// BEFORE:
include: { Tenant: true, Profile: true }

// AFTER:
include: { tenant: true, profile: true }
```

#### B. Property Access Fixes
```typescript
// BEFORE: 
user.Tenant, profile.User, project.ProjectMember

// AFTER:
user.tenant, profile.user, project.projectMember
```

### 3. Model Names to Fix (lowercase versions)
- `user`
- `tenant`
- `profile`
- `skill`
- `location`
- `project`
- `projectMember`
- `castingCall`
- `application`
- `studio`
- `profileImage`
- `payment`

### 4. Testing Approach
1. Fix one file at a time
2. Run `npm run typecheck` after each file fix
3. Test functionality manually where feasible
4. Use the `fix-schema.mjs` script to find remaining issues

### 5. Common Patterns to Fix

#### Prisma Query Include Statements
```typescript
// Fix all include clauses:
include: {
  Tenant: true,
  Profile: {
    include: { User: true }
  }
}

// To:
include: {
  tenant: true,
  profile: {
    include: { user: true }
  }
}
```

#### Object Property References
```typescript
// Fix all property references:
if (!user?.Tenant || user.Tenant.type !== "STUDIO") {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// To:
if (!user?.tenant || user.tenant.type !== "STUDIO") {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

#### Special Case: Relations with Custom Names
Pay special attention to relations with custom names:
```typescript
// Original pattern:
Profile_Message_talentReceiverIdToProfile: {
  include: { User: true }
}

// Fixed pattern:
profile_Message_talentReceiverIdToProfile: {
  include: { user: true }
}
```

### 6. Error Handling Improvements
In each file, also fix the error handling in catch blocks:

```typescript
// BEFORE:
catch (error) {
  console.error("Error:", error);
  return NextResponse.json({ error: "Operation failed" }, { status: 500 });
}

// AFTER:
catch (error) {
  console.error("Error:", error);
  return NextResponse.json({
    error: "Operation failed",
    details: error instanceof Error ? error.message : String(error)
  }, { status: 500 });
}
```

## Execution Plan
1. Start with highest priority API routes (authentication, user management)
2. Continue with studio-related routes
3. Fix talent and project management routes
4. Address remaining routes
5. Run final verification with the fix-schema.mjs script
6. Run comprehensive tests

This plan provides a systematic approach to fix the case sensitivity issues while maintaining the application's functionality.