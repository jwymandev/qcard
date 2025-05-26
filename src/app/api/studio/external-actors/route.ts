import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authPrisma } from '@/lib/secure-db-connection';
import { parse as csvParse } from 'csv-parse/sync';

// Schema for validating CSV row data
const csvRowSchema = z.object({
  email: z.string().email({ message: "Invalid email format" }).optional(),
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  phoneNumber: z.string().optional(),
  notes: z.string().optional(),
}).refine(data => {
  // Ensure there's either an email or phone number for contact
  return !!data.email || !!data.phoneNumber;
}, {
  message: "Either email or phone number must be provided",
  path: ["email"]
});

// Schema for manually adding a single external actor
const externalActorSchema = z.object({
  email: z.string().email({ message: "Invalid email format" }).optional(),
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  phoneNumber: z.string().optional(),
  notes: z.string().optional(),
}).refine(data => {
  // Ensure there's either an email or phone number for contact
  return !!data.email || !!data.phoneNumber;
}, {
  message: "Either email or phone number must be provided",
  path: ["email"]
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
    const user = await authPrisma.user.findUnique({
      where: { id: session.user.id },
      include: { Tenant: true },
    });
    
    if (!user || !user.Tenant || user.Tenant.type !== 'STUDIO') {
      return NextResponse.json({ error: 'Not a studio user' }, { status: 403 });
    }
    
    const studio = await authPrisma.studio.findUnique({
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
      externalActors = await authPrisma.externalActor.findMany({
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
      externalActors = await authPrisma.externalActor.findMany({
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
    const user = await authPrisma.user.findUnique({
      where: { id: session.user.id },
      include: { Tenant: true },
    });
    
    if (!user || !user.Tenant || user.Tenant.type !== 'STUDIO') {
      return NextResponse.json({ error: 'Not a studio user' }, { status: 403 });
    }
    
    const studio = await authPrisma.studio.findUnique({
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
      let records;
      try {
        records = csvParse(csvData, {
          columns: true,
          skip_empty_lines: true,
          trim: true, // Trim whitespace from fields
          relax_column_count: true, // Handle inconsistent column counts
        });
        
        console.log(`Successfully parsed CSV with ${records.length} records`);
      } catch (error) {
        console.error('CSV parsing error:', error);
        return NextResponse.json(
          { 
            error: 'Failed to parse CSV data', 
            details: error instanceof Error ? error.message : 'Invalid CSV format'
          },
          { status: 400 }
        );
      }
      
      // Validate and process each row
      const results = {
        success: 0,
        errors: [] as { row: number; email: string; error: string }[],
        duplicates: 0,
      };
      
      for (let i = 0; i < records.length; i++) {
        try {
          const rowNum = i + 1; // For error reporting (1-based)
          const row = records[i];
          
          // Normalize the row data before validation
          const normalizedRow = {
            email: row.email?.trim() || undefined,
            firstName: row.firstName?.trim() || undefined,
            lastName: row.lastName?.trim() || undefined,
            phoneNumber: row.phoneNumber?.trim() || undefined,
            notes: row.notes?.trim() || undefined,
          };
          
          // Check for required fields (either email or phone, and first/last name)
          if ((!normalizedRow.email && !normalizedRow.phoneNumber) || 
              !normalizedRow.firstName || !normalizedRow.lastName) {
            
            let missingFields = [];
            if (!normalizedRow.firstName) missingFields.push('First Name');
            if (!normalizedRow.lastName) missingFields.push('Last Name');
            if (!normalizedRow.email && !normalizedRow.phoneNumber) missingFields.push('Email or Phone Number');
            
            results.errors.push({
              row: rowNum,
              email: normalizedRow.email || 'Missing',
              error: `Missing required fields: ${missingFields.join(', ')}`
            });
            continue;
          }

          // Validate the row data
          const validationResult = csvRowSchema.safeParse(normalizedRow);
          
          if (!validationResult.success) {
            // Get formatted errors from Zod
            const formatErrors = validationResult.error.format();
            
            // Extract error messages safely with type checking
            let errorParts: string[] = [];
            
            Object.entries(formatErrors).forEach(([key, value]) => {
              // Skip the root _errors field
              if (key === '_errors') return;
              
              // Handle the error value which could be an object with _errors or something else
              if (value && typeof value === 'object' && '_errors' in value && Array.isArray(value._errors)) {
                if (value._errors.length > 0) {
                  errorParts.push(`${key}: ${value._errors.join(', ')}`);
                }
              }
            });
            
            const errorMessage = errorParts.join('; ');
              
            results.errors.push({
              row: rowNum,
              email: normalizedRow.email || 'Invalid',
              error: errorMessage || 'Validation error'
            });
            continue;
          }
          
          const validatedRow = validationResult.data;
          
          // Check if this external actor already exists for this studio
          let existingActorQuery: any = {
            studioId: studio.id,
          };
          
          if (validatedRow.email) {
            // If email is provided, check for duplicate email
            existingActorQuery.email = validatedRow.email;
          } else {
            // If no email, check for matching name and phone
            existingActorQuery.AND = [
              { firstName: validatedRow.firstName },
              { lastName: validatedRow.lastName },
              { phoneNumber: validatedRow.phoneNumber }
            ];
          }
          
          const existingActor = await authPrisma.externalActor.findFirst({
            where: existingActorQuery,
          });
          
          if (existingActor) {
            results.duplicates++;
            continue;
          }
          
          // Check if a user with this email already exists in the system (only if email is provided)
          let existingUser = null;
          if (validatedRow.email) {
            existingUser = await authPrisma.user.findUnique({
              where: { email: validatedRow.email },
              include: { Profile: true },
            });
          }
          
          // Create the external actor
          await authPrisma.externalActor.create({
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
            email: records[i]?.email || 'Unknown',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
      
      return NextResponse.json(results);
    } else {
      // This is a single actor addition
      const validatedData = externalActorSchema.parse(body);
      
      // Check if this external actor already exists
      let existingActorQuery: any = {
        studioId: studio.id,
      };
      
      if (validatedData.email) {
        // If email is provided, check for duplicate email
        existingActorQuery.email = validatedData.email;
      } else {
        // If no email, check for matching name and phone
        existingActorQuery.AND = [
          { firstName: validatedData.firstName },
          { lastName: validatedData.lastName },
          { phoneNumber: validatedData.phoneNumber }
        ];
      }
      
      const existingActor = await authPrisma.externalActor.findFirst({
        where: existingActorQuery,
      });
      
      if (existingActor) {
        return NextResponse.json(
          { error: 'External actor with the same details already exists' },
          { status: 409 }
        );
      }
      
      // Check if a user with this email already exists in the system (only if email provided)
      let existingUser = null;
      if (validatedData.email) {
        existingUser = await authPrisma.user.findUnique({
          where: { email: validatedData.email },
          include: { Profile: true },
        });
      }
      
      // Create the external actor
      const externalActor = await authPrisma.externalActor.create({
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
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.format() },
        { status: 400 }
      );
    }
    
    // Handle Prisma errors
    if (error instanceof Error && error.name === 'PrismaClientKnownRequestError') {
      // This is a Prisma error
      const errorMessage = error.message;
      if (errorMessage.includes('Unique constraint failed')) {
        return NextResponse.json(
          { error: 'Duplicate entry found. This email may already exist in your studio.' },
          { status: 409 }
        );
      }
    }
    
    // For CSV parsing errors
    if (error instanceof Error && error.message.includes('CSV')) {
      return NextResponse.json(
        { error: error.message || 'CSV parsing error' },
        { status: 400 }
      );
    }
    
    // Generic error
    return NextResponse.json(
      { error: 'Failed to create external actor', details: error instanceof Error ? error.message : 'Unknown error' },
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
    const user = await authPrisma.user.findUnique({
      where: { id: session.user.id },
      include: { Tenant: true },
    });
    
    if (!user || !user.Tenant || user.Tenant.type !== 'STUDIO') {
      return NextResponse.json({ error: 'Not a studio user' }, { status: 403 });
    }
    
    const studio = await authPrisma.studio.findUnique({
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