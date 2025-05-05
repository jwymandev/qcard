import { prisma } from '@/lib/db';

// Types for the schema system
export type FieldType = 
  | 'TEXT' 
  | 'TEXTAREA' 
  | 'NUMBER' 
  | 'DROPDOWN' 
  | 'BOOLEAN' 
  | 'DATE' 
  | 'EMAIL' 
  | 'URL' 
  | 'PHONE';

export type ProfileType = 'TALENT' | 'STUDIO' | 'BOTH';

export interface FieldOption {
  id: string;
  value: string;
  label: string;
  color?: string | null;
  order: number;
  isDefault: boolean;
}

export interface ValidationRule {
  type: 'min' | 'max' | 'pattern' | 'custom';
  value: string | number;
  message: string;
}

export interface ProfileField {
  id: string;
  name: string;
  label: string;
  description?: string | null;
  type: FieldType;
  profileType: ProfileType;
  isRequired: boolean;
  isVisible: boolean;
  defaultValue?: string | null;
  placeholder?: string | null;
  order: number;
  isSystem: boolean;
  groupName?: string | null;
  options?: FieldOption[];
  validationRules?: ValidationRule[];
  createdAt: Date;
  updatedAt: Date;
}

interface GroupedFields {
  [key: string]: ProfileField[];
}

/**
 * Get all profile fields for a specific profile type, grouped by their group name
 */
export async function getProfileFields(profileType: 'TALENT' | 'STUDIO'): Promise<GroupedFields> {
  // Fetch fields from database
  const fields = await prisma.profileField.findMany({
    where: {
      isVisible: true,
      OR: [
        { profileType },
        { profileType: 'BOTH' },
      ],
    },
    include: {
      options: {
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { order: 'asc' },
  });

  // Parse validation rules from JSON string
  const parsedFields = fields.map(field => ({
    ...field,
    validationRules: field.validationRules ? JSON.parse(field.validationRules) : [],
  }));

  // Group fields by group name
  const groupedFields: GroupedFields = {};
  
  parsedFields.forEach(field => {
    const group = field.groupName || 'Other';
    if (!groupedFields[group]) {
      groupedFields[group] = [];
    }
    groupedFields[group].push(field);
  });

  return groupedFields;
}

/**
 * Get field values for a specific profile
 */
export async function getProfileFieldValues(profileId: string): Promise<Record<string, any>> {
  const values = await prisma.profileFieldValue.findMany({
    where: { profileId },
  });

  // Convert to key-value pairs
  const result: Record<string, any> = {};
  values.forEach(value => {
    result[value.fieldId] = value.value;
  });

  return result;
}

/**
 * Get field values for a specific studio
 */
export async function getStudioFieldValues(studioId: string): Promise<Record<string, any>> {
  const values = await prisma.studioFieldValue.findMany({
    where: { studioId },
  });

  // Convert to key-value pairs
  const result: Record<string, any> = {};
  values.forEach(value => {
    result[value.fieldId] = value.value;
  });

  return result;
}

/**
 * Save values for profile fields
 */
export async function saveProfileFieldValues(profileId: string, values: Record<string, any>): Promise<void> {
  // Start a transaction
  await prisma.$transaction(async (tx) => {
    // For each field-value pair
    for (const [fieldId, value] of Object.entries(values)) {
      // Skip empty or null values
      if (value === null || value === undefined || value === '') {
        continue;
      }

      // Check if a value already exists
      const existingValue = await tx.profileFieldValue.findUnique({
        where: {
          profileId_fieldId: {
            profileId,
            fieldId,
          },
        },
      });

      if (existingValue) {
        // Update existing value
        await tx.profileFieldValue.update({
          where: {
            id: existingValue.id,
          },
          data: {
            value: String(value),
          },
        });
      } else {
        // Create new value
        await tx.profileFieldValue.create({
          data: {
            profileId,
            fieldId,
            value: String(value),
          },
        });
      }
    }
  });
}

/**
 * Save values for studio fields
 */
export async function saveStudioFieldValues(studioId: string, values: Record<string, any>): Promise<void> {
  // Start a transaction
  await prisma.$transaction(async (tx) => {
    // For each field-value pair
    for (const [fieldId, value] of Object.entries(values)) {
      // Skip empty or null values
      if (value === null || value === undefined || value === '') {
        continue;
      }

      // Check if a value already exists
      const existingValue = await tx.studioFieldValue.findUnique({
        where: {
          studioId_fieldId: {
            studioId,
            fieldId,
          },
        },
      });

      if (existingValue) {
        // Update existing value
        await tx.studioFieldValue.update({
          where: {
            id: existingValue.id,
          },
          data: {
            value: String(value),
          },
        });
      } else {
        // Create new value
        await tx.studioFieldValue.create({
          data: {
            studioId,
            fieldId,
            value: String(value),
          },
        });
      }
    }
  });
}

/**
 * Get default values for fields
 */
export function getDefaultValues(fields: ProfileField[]): Record<string, any> {
  const defaultValues: Record<string, any> = {};

  fields.forEach(field => {
    // Set default value if available
    if (field.defaultValue !== null && field.defaultValue !== undefined) {
      defaultValues[field.name] = field.defaultValue;
    } else if (field.type === 'DROPDOWN' && field.options && field.options.length > 0) {
      // For dropdowns, find the default option
      const defaultOption = field.options.find(option => option.isDefault);
      if (defaultOption) {
        defaultValues[field.name] = defaultOption.value;
      }
    } else if (field.type === 'BOOLEAN') {
      // Default boolean to false
      defaultValues[field.name] = false;
    } else {
      // Default to empty string for other types
      defaultValues[field.name] = '';
    }
  });

  return defaultValues;
}