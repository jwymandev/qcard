import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authPrisma } from '@/lib/secure-db-connection';
import { requireAdmin } from '@/lib/admin-helpers';
import bcrypt from '@/lib/bcrypt-wrapper';
import crypto from 'crypto';
import { z } from 'zod';

// Validation schema for user creation
const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']),
  tenantType: z.enum(['TALENT', 'STUDIO', 'ADMIN']),
});

// GET /api/admin/users
export async function GET(request: Request) {
  try {
    // Log the request for debugging
    console.log('GET /api/admin/users request received');
    
    // Check admin access with API-friendly options (throw instead of redirect)
    const session = await requireAdmin({ 
      redirectOnFailure: false, 
      throwOnFailure: true 
    });
    
    if (!session) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    console.log('Admin access granted to:', session?.user?.email);

    // Get query params
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const role = searchParams.get('role');
    const tenantType = searchParams.get('tenantType');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;
    
    console.log('Query params:', { search, role, tenantType, limit, page });

    // Base query
    let where: any = {};

    // Add search filter
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Add role filter
    if (role) {
      where.role = role;
    }

    // Add tenant type filter
    if (tenantType) {
      where.Tenant = {
        type: tenantType,
      };
    }

    // Get total count - use authPrisma for reliability
    console.log('Counting total users with authPrisma');
    const totalCount = await authPrisma.user.count({ where });
    console.log(`Total user count: ${totalCount}`);

    // Get users - use authPrisma for reliability
    console.log('Fetching users with authPrisma');
    const users = await authPrisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        Tenant: {
          select: {
            id: true,
            type: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });
    
    console.log(`Found ${users.length} users`);

    // Format response
    const formattedUsers = users.map(user => {
      // Ensure we have the proper data structure
      const userData = {
        id: user.id,
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        role: user.role,
        tenantType: user.Tenant?.type || null,
        tenantName: user.Tenant?.name || null,
        tenantId: user.Tenant?.id || null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
      
      console.log(`Formatted user: ${userData.email}`);
      return userData;
    });

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/admin/users
export async function POST(request: Request) {
  try {
    console.log('POST /api/admin/users request received');
    
    // Check admin access with API-friendly options
    const session = await requireAdmin({ 
      redirectOnFailure: false, 
      throwOnFailure: true 
    });
    
    if (!session) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    console.log('Admin access granted for user creation to:', session?.user?.email);
    
    // Parse and validate request body
    const body = await request.json();
    console.log('Received user creation request:', { ...body, password: '[REDACTED]' });
    
    const validationResult = createUserSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error.flatten());
      return NextResponse.json(
        { 
          error: 'Invalid user data', 
          details: validationResult.error.flatten() 
        },
        { status: 400 }
      );
    }

    const { email, password, firstName, lastName, role, tenantType } = validationResult.data;

    // Check if user with this email already exists - use authPrisma for reliability
    const existingUser = await authPrisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password with our wrapped bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully');

    // Use transaction to ensure all operations succeed or fail together
    console.log('Creating user with tenant using transaction');
    
    // Generate IDs once to ensure consistency
    const tenantId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const profileId = crypto.randomUUID();
    const studioId = crypto.randomUUID();
    const now = new Date();
    
    // Format tenant name
    const tenantName = `${firstName || ''} ${lastName || ''}`.trim() || email;
    
    try {
      // Use a transaction if available
      if (typeof authPrisma.$transaction === 'function') {
        const result = await authPrisma.$transaction(async (tx) => {
          // Create tenant
          const tenant = await tx.tenant.create({
            data: {
              id: tenantId,
              name: tenantName,
              type: tenantType,
              createdAt: now,
              updatedAt: now
            },
          });
          console.log(`Tenant created with ID: ${tenant.id}`);
          
          // Create user
          const user = await tx.user.create({
            data: {
              id: userId,
              email,
              password: hashedPassword,
              firstName: firstName || null,
              lastName: lastName || null,
              role,
              tenantId: tenant.id,
              createdAt: now,
              updatedAt: now
            },
          });
          console.log(`User created with ID: ${user.id}`);
          
          // If tenant type is TALENT, create profile
          let profile = null;
          if (tenantType === 'TALENT') {
            profile = await tx.profile.create({
              data: {
                id: profileId,
                userId: user.id,
                availability: true,
                createdAt: now,
                updatedAt: now
              },
            });
            console.log(`Profile created with ID: ${profile.id}`);
          }
          
          // If tenant type is STUDIO, create studio
          let studio = null;
          if (tenantType === 'STUDIO') {
            studio = await tx.studio.create({
              data: {
                id: studioId,
                name: tenantName,
                tenantId: tenant.id,
                description: `Studio for ${tenantName}`,
                createdAt: now,
                updatedAt: now
              },
            });
            console.log(`Studio created with ID: ${studio.id}`);
          }
          
          return { tenant, user, profile, studio };
        });
        
        // Set the created objects from transaction result
        const tenant = result.tenant;
        const user = result.user;
      } else {
        // Sequential operations if transaction is not available
        console.log('Transaction not available, using sequential operations');
        
        // Create tenant
        const tenant = await authPrisma.tenant.create({
          data: {
            id: tenantId,
            name: tenantName,
            type: tenantType,
            createdAt: now,
            updatedAt: now
          },
        });
        console.log(`Tenant created with ID: ${tenant.id}`);
        
        // Create user
        const user = await authPrisma.user.create({
          data: {
            id: userId,
            email,
            password: hashedPassword,
            firstName: firstName || null,
            lastName: lastName || null,
            role,
            tenantId: tenant.id,
            createdAt: now,
            updatedAt: now
          },
        });
        console.log(`User created with ID: ${user.id}`);
        
        // If tenant type is TALENT, create profile
        if (tenantType === 'TALENT') {
          const profile = await authPrisma.profile.create({
            data: {
              id: profileId,
              userId: user.id,
              availability: true,
              createdAt: now,
              updatedAt: now
            },
          });
          console.log(`Profile created with ID: ${profile.id}`);
        }
        
        // If tenant type is STUDIO, create studio
        if (tenantType === 'STUDIO') {
          const studio = await authPrisma.studio.create({
            data: {
              id: studioId,
              name: tenantName,
              tenantId: tenant.id,
              description: `Studio for ${tenantName}`,
              createdAt: now,
              updatedAt: now
            },
          });
          console.log(`Studio created with ID: ${studio.id}`);
        }
      }
    } catch (createError) {
      console.error('Error during user creation transaction:', createError);
      throw createError;
    }

    // Get the created user to return (without password)
    const createdUser = await authPrisma.user.findUnique({
      where: { email },
      include: { Tenant: true }
    });
    
    if (!createdUser) {
      throw new Error("User creation failed - created user not found");
    }
    
    // Return created user (without password)
    return NextResponse.json({
      id: createdUser.id,
      email: createdUser.email,
      firstName: createdUser.firstName,
      lastName: createdUser.lastName,
      role: createdUser.role,
      tenantType,
      tenantId: createdUser.tenantId,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create user',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}