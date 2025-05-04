import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-helpers';
import { z } from 'zod';

// Define validation schema for field creation/update
const fieldSchema = z.object({
  name: z.string().min(1).regex(/^[a-zA-Z0-9_]+$/, 'Field name must contain only letters, numbers, and underscores'),
  label: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['TEXT', 'TEXTAREA', 'NUMBER', 'DROPDOWN', 'BOOLEAN', 'DATE', 'EMAIL', 'URL', 'PHONE']),
  profileType: z.enum(['TALENT', 'STUDIO', 'BOTH']),
  isRequired: z.boolean(),
  isVisible: z.boolean(),
  defaultValue: z.string().optional(),
  placeholder: z.string().optional(),
  groupName: z.string().optional(),
  validationRules: z.string().optional(),
  options: z.array(
    z.object({
      id: z.string().optional(),
      value: z.string().min(1),
      label: z.string().min(1),
      color: z.string().optional(),
      order: z.number(),
      isDefault: z.boolean(),
    })
  ).optional(),
});

// POST /api/admin/schema/field - Create a new field
export async function POST(request: Request) {
  try {
    // Check admin access
    await requireAdmin();
    
    // Parse request body
    const body = await request.json();
    
    // Validate request body
    const validationResult = fieldSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid field data', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    
    // Check if a field with this name already exists
    const existingField = await prisma.profileField.findFirst({
      where: { name: data.name },
    });
    
    if (existingField) {
      return NextResponse.json(
        { error: 'A field with this name already exists' },
        { status: 400 }
      );
    }
    
    // Get the highest order value to determine the new field's order
    const highestOrderField = await prisma.profileField.findFirst({
      orderBy: { order: 'desc' },
    });
    
    const newOrder = highestOrderField ? highestOrderField.order + 1 : 1;
    
    // Start a transaction to create the field and its options
    const newField = await prisma.$transaction(async (tx) => {
      // Create the field
      const field = await tx.profileField.create({
        data: {
          name: data.name,
          label: data.label,
          description: data.description || null,
          type: data.type,
          profileType: data.profileType,
          isRequired: data.isRequired,
          isVisible: data.isVisible,
          defaultValue: data.defaultValue || null,
          placeholder: data.placeholder || null,
          order: newOrder,
          groupName: data.groupName || null,
          validationRules: data.validationRules || null,
          isSystem: false,
        },
      });
      
      // Create options for dropdown fields
      if (data.type === 'DROPDOWN' && data.options && data.options.length > 0) {
        await Promise.all(
          data.options.map((option, index) => 
            tx.fieldOption.create({
              data: {
                value: option.value,
                label: option.label,
                color: option.color || null,
                order: option.order || index + 1,
                isDefault: option.isDefault || false,
                fieldId: field.id,
              },
            })
          )
        );
      }
      
      return field;
    });
    
    // Return the created field
    return NextResponse.json(newField);
  } catch (error) {
    console.error('Error creating profile field:', error);
    return NextResponse.json(
      { error: 'Failed to create profile field' },
      { status: 500 }
    );
  }
}