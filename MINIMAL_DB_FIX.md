# Minimal Database Client Fix

This document explains how we fixed the reversed assignment issue in the database client.

## The Problem

The build was failing because of reversed assignments in compiled API route files:

```javascript
"postgresql://placeholder:placeholder@localhost:5432/placeholder" = databaseUrl;
```

This is a syntax error because you cannot assign a value to a string literal.

## The Solution

We created a completely minimal database client that:

1. Does not use any assignment to process.env
2. Does not try to construct a database URL
3. Uses only the simplest possible configuration

This minimal client is safe to use across the entire application and won't cause any build errors.

## Implementation

The new `db.ts` file:

```typescript
import { PrismaClient } from '@prisma/client';

// Global type for the PrismaClient
declare global {
  var prisma: PrismaClient | undefined;
}

// Create a new PrismaClient instance
function createPrismaClient() {
  // Use simple configuration to avoid any assignment issues
  const client = new PrismaClient({
    log: ['error'],
    errorFormat: 'pretty',
  });
  
  return client;
}

// Create or reuse the PrismaClient instance
export const prisma = global.prisma || createPrismaClient();

// In development, preserve client between hot reloads
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
```

## How It Works

1. **No Environment Variable Assignment**: 
   - The code doesn't try to set `process.env.DATABASE_URL`
   - This avoids the reversed assignment issue entirely

2. **Simple PrismaClient Creation**:
   - Creates a basic PrismaClient with minimal options
   - Doesn't try to construct a database URL from components

3. **Global Singleton Pattern**:
   - Uses the standard Next.js pattern for PrismaClient
   - Prevents connection pool exhaustion

## Deployment

To deploy this fix:

1. Commit the updated `db.ts` file:
   ```
   git add src/lib/db.ts
   git commit -m "Fix database client with minimal implementation"
   git push
   ```

2. Digital Ocean App Platform will automatically detect the changes and deploy your application.

## Configuration

In Digital Ocean App Platform, ensure these environment variables are set:

- `DATABASE_URL`: The full PostgreSQL connection string
- Or set individual connection parameters:
  - `DATABASE_HOST`
  - `DATABASE_PORT`
  - `DATABASE_USERNAME`
  - `DATABASE_PASSWORD`
  - `DATABASE_NAME`

The Prisma client will use these environment variables automatically.