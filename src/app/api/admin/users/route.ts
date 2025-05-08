import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-helpers';
import bcrypt from 'bcrypt';
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

    // Get total count
    const totalCount = await prisma.user.count({ where });

    // Get users
    const users = await prisma.user.findMany({
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

    // Format response
    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      role: user.role,
      tenantType: user.Tenant?.type || null,
      tenantName: user.Tenant?.name || null,
      tenantId: user.Tenant?.id || null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

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

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create tenant
    const tenantName = `${firstName || ''} ${lastName || ''}`.trim() || email;
    const tenant = await prisma.tenant.create({
      data: {
        id: crypto.randomUUID(),
        name: tenantName,
        type: tenantType,
        updatedAt: new Date()
      },
    });

    // Create user
    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        role,
        tenantId: tenant.id,
        updatedAt: new Date()
      },
    });

    // If tenant type is TALENT, create profile
    if (tenantType === 'TALENT') {
      await prisma.profile.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          availability: true,
          updatedAt: new Date()
        },
      });
    }
    
    // If tenant type is STUDIO, create studio
    if (tenantType === 'STUDIO') {
      await prisma.studio.create({
        data: {
          id: crypto.randomUUID(),
          name: tenantName,
          tenantId: tenant.id,
          description: `Studio for ${tenantName}`,
          updatedAt: new Date()
        },
      });
    }

    // Return created user (without password)
    return NextResponse.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenantType,
      tenantId: tenant.id,
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