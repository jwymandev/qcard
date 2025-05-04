# Case Sensitivity Fix Examples

This document provides specific examples of the changes needed for different files in the codebase.

## Example 1: Basic Include Statements

**File: `/src/app/api/studio/profile/route.ts`**

```typescript
// BEFORE
const user = await prisma.user.findUnique({
  where: { id: session.user.id },
  include: { Tenant: true },
});

if (!user?.Tenant || user.Tenant.type !== "STUDIO") {
  return NextResponse.json({ error: "Only studio accounts can access this endpoint" }, { status: 403 });
}

// AFTER
const user = await prisma.user.findUnique({
  where: { id: session.user.id },
  include: { tenant: true },
});

if (!user?.tenant || user.tenant.type !== "STUDIO") {
  return NextResponse.json({ error: "Only studio accounts can access this endpoint" }, { status: 403 });
}
```

## Example 2: Nested Include Statements

**File: `/src/app/api/studio/messages/route.ts`**

```typescript
// BEFORE
messages = await prisma.message.findMany({
  where: {
    studioSenderId: studio.id,
  },
  include: {
    Profile_Message_talentReceiverIdToProfile: {
      include: {
        User: true
      }
    },
    Studio_Message_studioSenderIdToStudio: true,
  },
  orderBy: { createdAt: 'desc' },
});

// AFTER
messages = await prisma.message.findMany({
  where: {
    studioSenderId: studio.id,
  },
  include: {
    profile_Message_talentReceiverIdToProfile: {
      include: {
        user: true
      }
    },
    studio_Message_studioSenderIdToStudio: true,
  },
  orderBy: { createdAt: 'desc' },
});
```

## Example 3: Property Access in Return Values

**File: `/src/app/api/studio/projects/[id]/members/route.ts`**

```typescript
// BEFORE
return NextResponse.json({
  ...project,
  members: project.ProjectMember.map(member => ({
    id: member.id,
    role: member.role,
    profile: member.Profile,
    user: member.Profile?.User,
  })),
});

// AFTER
return NextResponse.json({
  ...project,
  members: project.projectMember.map(member => ({
    id: member.id,
    role: member.role,
    profile: member.profile,
    user: member.profile?.user,
  })),
});
```

## Example 4: Error Handling Improvement

**File: Any API route**

```typescript
// BEFORE
try {
  // Code that might throw
} catch (error) {
  console.error("Operation failed:", error);
  return NextResponse.json({ 
    error: "Failed to perform operation",
    message: error.message,
    code: error.code || 'unknown'
  }, { status: 500 });
}

// AFTER
try {
  // Code that might throw
} catch (error) {
  console.error("Operation failed:", error);
  return NextResponse.json({ 
    error: "Failed to perform operation",
    details: error instanceof Error ? error.message : String(error),
    code: error instanceof Error && 'code' in error ? error.code : 'unknown'
  }, { status: 500 });
}
```

## Example 5: Complex Model Relationships

**File: `/src/app/api/studio/casting-calls/[id]/applications/route.ts`**

```typescript
// BEFORE
const applications = await prisma.application.findMany({
  where: { castingCallId: castingCallId },
  include: {
    Profile: {
      include: {
        User: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        Skill: true,
        Location: true,
        ProfileImage: {
          where: { isPrimary: true }
        }
      }
    },
    CastingCall: {
      include: {
        Studio: true
      }
    }
  },
  orderBy: { createdAt: 'desc' }
});

// AFTER
const applications = await prisma.application.findMany({
  where: { castingCallId: castingCallId },
  include: {
    profile: {
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        skill: true,
        location: true,
        profileImage: {
          where: { isPrimary: true }
        }
      }
    },
    castingCall: {
      include: {
        studio: true
      }
    }
  },
  orderBy: { createdAt: 'desc' }
});
```

## Example 6: Model Name vs. Property Name

**File: `/src/app/api/studio/profile/route.ts`**

```typescript
// BEFORE
const studio = await prisma.studio.findFirst({
  where: { tenantId: user.Tenant.id },
  include: { Location: true }
});

// Return the studio profile, mapping Location to lowercase for frontend compatibility
return NextResponse.json({
  ...studio,
  locations: studio.Location,
});

// AFTER
const studio = await prisma.studio.findFirst({
  where: { tenantId: user.tenant.id },
  include: { location: true }
});

// Return the studio profile, Prisma relation is now lowercase
return NextResponse.json({
  ...studio,
  locations: studio.location,
});
```

These examples cover the most common patterns that need to be fixed throughout the codebase. Use them as a reference when making changes to ensure consistency.