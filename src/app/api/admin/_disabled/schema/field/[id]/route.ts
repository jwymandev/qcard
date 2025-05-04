import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-helpers';
import { z } from 'zod';

// Define validation schema for field update
const fieldUpdateSchema = z.object({
  name: z.string().min(1).regex(/^[a-zA-Z0-9_]+$/, 'Field name must contain only letters, numbers, and underscores').optional(),
  label: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  type: z.enum(['TEXT', 'TEXTAREA', 'NUMBER', 'DROPDOWN', 'BOOLEAN', 'DATE', 'EMAIL', 'URL', 'PHONE']).optional(),
  profileType: z.enum(['TALENT', 'STUDIO', 'BOTH']).optional(),
  isRequired: z.boolean().optional(),
  isVisible: z.boolean().optional(),
  defaultValue: z.string().optional().nullable(),
  placeholder: z.string().optional().nullable(),
  groupName: z.string().optional().nullable(),
  validationRules: z.string().optional().nullable(),
  options: z.array(
    z.object({
      id: z.string().optional(),
      value: z.string().min(1),
      label: z.string().min(1),
      color: z.string().optional().nullable(),
      order: z.number(),
      isDefault: z.boolean(),
    })
  ).optional(),
});

// GET /api/admin/schema/field/{id} - Get a specific field
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    // Check admin access
    await requireAdmin();
    
    const fieldId = params.id;
    
    // Get the field with its options
    const field = await prisma.profileField.findUnique({
      where: { id: fieldId },
      include: {
        options: {
          orderBy: { order: 'asc' },
        },
      },
    });
    
    // Check if field exists
    if (!field) {
      return NextResponse.json(
        { error: 'Field not found' },
        { status: 404 }
      );
    }
    
    // Format validation rules from JSON string to object
    const formattedField = {
      ...field,
      validationRules: field.validationRules 
        ? JSON.parse(field.validationRules)
        : [],
    };
    
    // Return the field
    return NextResponse.json(formattedField);
  } catch (error) {
    console.error('Error fetching profile field:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile field' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/schema/field/{id} - Update a field
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    // Check admin access
    await requireAdmin();
    
    const fieldId = params.id;
    
    // Parse request body
    const body = await request.json();
    
    // Validate request body
    const validationResult = fieldUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid field data', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    
    // Get the existing field
    const existingField = await prisma.profileField.findUnique({
      where: { id: fieldId },
      include: { options: true },
    });
    
    // Check if field exists
    if (!existingField) {
      return NextResponse.json(
        { error: 'Field not found' },
        { status: 404 }
      );
    }
    
    // Check if this is a system field with restricted updates
    if (existingField.isSystem) {
      // For system fields, only allow updating certain properties
      const allowedSystemUpdates = {
        label: data.label,
        description: data.description,
        isRequired: data.isRequired,
        isVisible: data.isVisible,
        defaultValue: data.defaultValue,
        placeholder: data.placeholder,
        groupName: data.groupName,
        validationRules: data.validationRules,
      };
      
      // Filter out undefined values
      const filteredUpdates = Object.fromEntries(
        Object.entries(allowedSystemUpdates)
          .filter(([_, value]) => value !== undefined)
      );
      
      // Update the field
      const updatedField = await prisma.profileField.update({
        where: { id: fieldId },
        data: filteredUpdates,
        include: { options: true },
      });
      
      // Only update options for dropdown fields
      if (existingField.type === 'DROPDOWN' && data.options) {
        await updateFieldOptions(fieldId, data.options, existingField.options);
      }
      
      return NextResponse.json(updatedField);
    }
    
    // For non-system fields, allow updating all properties
    const updatedField = await prisma.profileField.update({
      where: { id: fieldId },
      data: {
        name: data.name,
        label: data.label,
        description: data.description,
        type: data.type,
        profileType: data.profileType,
        isRequired: data.isRequired,
        isVisible: data.isVisible,
        defaultValue: data.defaultValue,
        placeholder: data.placeholder,
        groupName: data.groupName,
        validationRules: data.validationRules,
      },
      include: { options: true },
    });
    
    // Update options for dropdown fields
    if (data.type === 'DROPDOWN' && data.options) {
      await updateFieldOptions(fieldId, data.options, existingField.options);
    }
    
    // Return the updated field
    return NextResponse.json(updatedField);
  } catch (error) {
    console.error('Error updating profile field:', error);
    return NextResponse.json(
      { error: 'Failed to update profile field' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/schema/field/{id} - Partial update a field
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    // Check admin access
    await requireAdmin();
    
    const fieldId = params.id;
    
    // Parse request body
    const body = await request.json();
    
    // Get the existing field
    const existingField = await prisma.profileField.findUnique({
      where: { id: fieldId },
    });
    
    // Check if field exists
    if (!existingField) {
      return NextResponse.json(
        { error: 'Field not found' },
        { status: 404 }
      );
    }
    
    // Update the field
    const updatedField = await prisma.profileField.update({
      where: { id: fieldId },
      data: body,
    });
    
    // Return the updated field
    return NextResponse.json(updatedField);
  } catch (error) {
    console.error('Error updating profile field:', error);
    return NextResponse.json(
      { error: 'Failed to update profile field' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/schema/field/{id} - Delete a field
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    // Check admin access
    await requireAdmin();
    
    const fieldId = params.id;
    
    // Get the existing field
    const existingField = await prisma.profileField.findUnique({
      where: { id: fieldId },
    });
    
    // Check if field exists
    if (!existingField) {
      return NextResponse.json(
        { error: 'Field not found' },
        { status: 404 }
      );
    }
    
    // Check if this is a system field
    if (existingField.isSystem) {
      return NextResponse.json(
        { error: 'Cannot delete system fields' },
        { status: 403 }
      );
    }
    
    // Delete the field (cascade will delete options)
    await prisma.profileField.delete({
      where: { id: fieldId },
    });
    
    // Return success
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting profile field:', error);
    return NextResponse.json(
      { error: 'Failed to delete profile field' },
      { status: 500 }
    );
  }
}

// Helper function to update field options
async function updateFieldOptions(fieldId: string, newOptions: any[], existingOptions: any[]) {
  // Create a map of existing options by ID
  const existingOptionsMap = new Map(
    existingOptions.map(option => [option.id, option])
  );
  
  // Process each new option
  for (const option of newOptions) {
    if (option.id && existingOptionsMap.has(option.id)) {
      // Update existing option
      await prisma.fieldOption.update({
        where: { id: option.id },
        data: {
          value: option.value,
          label: option.label,
          color: option.color,
          order: option.order,
          isDefault: option.isDefault,
        },
      });
      
      // Remove from map to track which ones to delete
      existingOptionsMap.delete(option.id);
    } else {
      // Create new option
      await prisma.fieldOption.create({
        data: {
          value: option.value,
          label: option.label,
          color: option.color || null,
          order: option.order,
          isDefault: option.isDefault,
          fieldId,
        },
      });
    }
  }
  
  // Delete options that weren't in the update
  for (const [id, _] of existingOptionsMap) {
    await prisma.fieldOption.delete({
      where: { id },
    });
  }
}