import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { parse as csvParse } from 'csv-parse/sync';

// Schema for validating CSV row data
const csvRowSchema = z.object({
  email: z.string().email({ message: "Invalid email format" }),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phoneNumber: z.string().optional(),
  notes: z.string().optional(),
});

// Schema for manually adding a single external actor
const externalActorSchema = z.object({
  email: z.string().email({ message: "Invalid email format" }),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phoneNumber: z.string().optional(),
  notes: z.string().optional(),
});

// Schema for CSV upload request
const csvUploadSchema = z.object({
  csvData: z.string(),
});

// GET: List all external actors for the studio
export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the studio ID from the user's tenant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { Tenant: true },
    });
    
    if (!user || !user.Tenant || user.Tenant.type !== 'STUDIO') {
      return NextResponse.json({ error: 'Not a studio user' }, { status: 403 });
    }
    
    const studio = await prisma.studio.findUnique({
      where: { tenantId: user.tenantId! },
    });
    
    if (!studio) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }
    
    // Get URL parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const projectId = searchParams.get('projectId');
    const id = searchParams.get('id');
    const email = searchParams.get('email');
    const phone = searchParams.get('phone');
    
    // Build the query filter
    const filter: any = {
      studioId: studio.id,
    };
    
    if (status) {
      filter.status = status;
    }
    
    if (id) {
      filter.id = id;
    }
    
    if (email) {
      filter.email = email;
    }
    
    if (phone) {
      filter.phoneNumber = phone;
    }
    
    // Get external actors with optional project filter
    let externalActors;
    
    if (projectId) {
      externalActors = await prisma.externalActor.findMany({
        where: {
          ...filter,
          projects: {
            some: {
              projectId,
            },
          },
        },
        include: {
          projects: {
            include: {
              project: true,
            },
          },
          convertedProfile: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } else {
      externalActors = await prisma.externalActor.findMany({
        where: filter,
        include: {
          projects: {
            include: {
              project: true,
            },
          },
          convertedProfile: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }
    
    return NextResponse.json(externalActors);
  } catch (error) {
    console.error('Error fetching external actors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch external actors' },
      { status: 500 }
    );
  }
}

// POST: Create a new external actor or upload CSV
export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the studio ID from the user's tenant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { Tenant: true },
    });
    
    if (!user || !user.Tenant || user.Tenant.type !== 'STUDIO') {
      return NextResponse.json({ error: 'Not a studio user' }, { status: 403 });
    }
    
    const studio = await prisma.studio.findUnique({
      where: { tenantId: user.tenantId! },
    });
    
    if (!studio) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }
    
    // Parse request body
    const body = await request.json();
    
    // Check if this is a CSV upload or a single actor addition
    if (body.csvData) {
      // This is a CSV upload
      const validatedData = csvUploadSchema.parse(body);
      const csvData = validatedData.csvData;
      
      // Parse CSV data
      const records = csvParse(csvData, {
        columns: true,
        skip_empty_lines: true,
      });
      
      // Validate and process each row
      const results = {
        success: 0,
        errors: [] as { row: number; email: string; error: string }[],
        duplicates: 0,
      };
      
      for (let i = 0; i < records.length; i++) {
        try {
          const row = records[i];
          const validatedRow = csvRowSchema.parse(row);
          
          // Check if this external actor already exists for this studio
          const existingActor = await prisma.externalActor.findFirst({
            where: {
              email: validatedRow.email,
              studioId: studio.id,
            },
          });
          
          if (existingActor) {
            results.duplicates++;
            continue;
          }
          
          // Check if a user with this email already exists in the system
          const existingUser = await prisma.user.findUnique({
            where: { email: validatedRow.email },
            include: { Profile: true },
          });
          
          // Create the external actor
          await prisma.externalActor.create({
            data: {
              email: validatedRow.email,
              firstName: validatedRow.firstName,
              lastName: validatedRow.lastName,
              phoneNumber: validatedRow.phoneNumber,
              notes: validatedRow.notes,
              studioId: studio.id,
              status: existingUser?.Profile ? 'CONVERTED' : 'ACTIVE',
              convertedToTalentAt: existingUser?.Profile ? new Date() : null,
              convertedProfileId: existingUser?.Profile?.id,
            },
          });
          
          results.success++;
        } catch (error) {
          console.error(`Error processing row ${i + 1}:`, error);
          results.errors.push({
            row: i + 1,
            email: records[i].email || 'Unknown',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
      
      return NextResponse.json(results);
    } else {
      // This is a single actor addition
      const validatedData = externalActorSchema.parse(body);
      
      // Check if this external actor already exists for this studio
      const existingActor = await prisma.externalActor.findFirst({
        where: {
          email: validatedData.email,
          studioId: studio.id,
        },
      });
      
      if (existingActor) {
        return NextResponse.json(
          { error: 'External actor with this email already exists' },
          { status: 409 }
        );
      }
      
      // Check if a user with this email already exists in the system
      const existingUser = await prisma.user.findUnique({
        where: { email: validatedData.email },
        include: { Profile: true },
      });
      
      // Create the external actor
      const externalActor = await prisma.externalActor.create({
        data: {
          email: validatedData.email,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          phoneNumber: validatedData.phoneNumber,
          notes: validatedData.notes,
          studioId: studio.id,
          status: existingUser?.Profile ? 'CONVERTED' : 'ACTIVE',
          convertedToTalentAt: existingUser?.Profile ? new Date() : null,
          convertedProfileId: existingUser?.Profile?.id,
        },
      });
      
      return NextResponse.json(externalActor);
    }
  } catch (error) {
    console.error('Error creating external actor:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.format() },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create external actor' },
      { status: 500 }
    );
  }
}

// DELETE: Remove an external actor (admin only)
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the URL parameters
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'External actor ID is required' },
        { status: 400 }
      );
    }
    
    // Get the studio ID from the user's tenant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { Tenant: true },
    });
    
    if (!user || !user.Tenant || user.Tenant.type !== 'STUDIO') {
      return NextResponse.json({ error: 'Not a studio user' }, { status: 403 });
    }
    
    const studio = await prisma.studio.findUnique({
      where: { tenantId: user.tenantId! },
    });
    
    if (!studio) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }
    
    // Check if the external actor exists and belongs to this studio
    const externalActor = await prisma.externalActor.findFirst({
      where: {
        id,
        studioId: studio.id,
      },
    });
    
    if (!externalActor) {
      return NextResponse.json(
        { error: 'External actor not found' },
        { status: 404 }
      );
    }
    
    // Delete the external actor
    await prisma.externalActor.delete({
      where: {
        id,
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting external actor:', error);
    return NextResponse.json(
      { error: 'Failed to delete external actor' },
      { status: 500 }
    );
  }
}