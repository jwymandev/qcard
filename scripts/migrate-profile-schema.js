/**
 * Profile Schema Migration Script
 * 
 * This script migrates existing profile data to the new dynamic schema system.
 * It will:
 * 1. Create system field definitions for all existing profile/studio fields
 * 2. Migrate existing data to the new value storage tables
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Field mappings for talent profiles
const talentFieldMappings = [
  {
    name: 'bio',
    label: 'Biography',
    type: 'TEXTAREA',
    description: 'Personal biography or description',
    groupName: 'Basic Information',
  },
  {
    name: 'height',
    label: 'Height',
    type: 'TEXT',
    description: 'Your height',
    placeholder: "e.g. 5'10\"",
    groupName: 'Physical Attributes',
  },
  {
    name: 'weight',
    label: 'Weight',
    type: 'TEXT',
    description: 'Your weight',
    placeholder: 'e.g. 160 lbs',
    groupName: 'Physical Attributes',
  },
  {
    name: 'hairColor',
    label: 'Hair Color',
    type: 'DROPDOWN',
    groupName: 'Physical Attributes',
    options: [
      { value: 'black', label: 'Black', order: 1 },
      { value: 'brown', label: 'Brown', order: 2, isDefault: true },
      { value: 'blonde', label: 'Blonde', order: 3 },
      { value: 'red', label: 'Red', order: 4 },
      { value: 'gray', label: 'Gray/Silver', order: 5 },
      { value: 'other', label: 'Other', order: 6 },
    ],
  },
  {
    name: 'eyeColor',
    label: 'Eye Color',
    type: 'DROPDOWN',
    groupName: 'Physical Attributes',
    options: [
      { value: 'brown', label: 'Brown', order: 1, isDefault: true },
      { value: 'blue', label: 'Blue', order: 2 },
      { value: 'green', label: 'Green', order: 3 },
      { value: 'hazel', label: 'Hazel', order: 4 },
      { value: 'gray', label: 'Gray', order: 5 },
      { value: 'other', label: 'Other', order: 6 },
    ],
  },
  {
    name: 'gender',
    label: 'Gender',
    type: 'DROPDOWN',
    groupName: 'Basic Information',
    options: [
      { value: 'male', label: 'Male', order: 1 },
      { value: 'female', label: 'Female', order: 2 },
      { value: 'non-binary', label: 'Non-binary', order: 3 },
      { value: 'prefer-not-to-say', label: 'Prefer not to say', order: 4, isDefault: true },
      { value: 'other', label: 'Other', order: 5 },
    ],
  },
  {
    name: 'ethnicity',
    label: 'Ethnicity',
    type: 'DROPDOWN',
    groupName: 'Basic Information',
    options: [
      { value: 'african', label: 'African', order: 1 },
      { value: 'asian', label: 'Asian', order: 2 },
      { value: 'caucasian', label: 'Caucasian', order: 3 },
      { value: 'hispanic', label: 'Hispanic/Latino', order: 4 },
      { value: 'middle-eastern', label: 'Middle Eastern', order: 5 },
      { value: 'native-american', label: 'Native American', order: 6 },
      { value: 'pacific-islander', label: 'Pacific Islander', order: 7 },
      { value: 'multiracial', label: 'Multiracial', order: 8 },
      { value: 'other', label: 'Other', order: 9 },
      { value: 'prefer-not-to-say', label: 'Prefer not to say', order: 10, isDefault: true },
    ],
  },
  {
    name: 'languages',
    label: 'Languages',
    type: 'TEXT',
    description: 'Languages you speak (comma separated)',
    placeholder: 'e.g. English, Spanish, French',
    groupName: 'Skills & Experience',
  },
  {
    name: 'experience',
    label: 'Experience',
    type: 'TEXTAREA',
    description: 'Your acting and performance experience',
    groupName: 'Skills & Experience',
  },
  {
    name: 'availability',
    label: 'Available for Work',
    type: 'BOOLEAN',
    description: 'Are you currently available for casting?',
    defaultValue: 'true',
    groupName: 'Availability',
  },
];

// Field mappings for studio profiles
const studioFieldMappings = [
  {
    name: 'name',
    label: 'Studio Name',
    type: 'TEXT',
    isRequired: true,
    description: 'Your studio or production company name',
    groupName: 'Basic Information',
  },
  {
    name: 'description',
    label: 'Description',
    type: 'TEXTAREA',
    description: 'Describe your studio or production company',
    groupName: 'Basic Information',
  },
  {
    name: 'contactName',
    label: 'Contact Name',
    type: 'TEXT',
    description: 'Name of the primary contact person',
    groupName: 'Contact Information',
  },
  {
    name: 'contactEmail',
    label: 'Contact Email',
    type: 'EMAIL',
    description: 'Email address for inquiries',
    groupName: 'Contact Information',
  },
  {
    name: 'contactPhone',
    label: 'Contact Phone',
    type: 'PHONE',
    description: 'Phone number for inquiries',
    groupName: 'Contact Information',
  },
  {
    name: 'website',
    label: 'Website',
    type: 'URL',
    description: 'Your studio\'s website URL',
    placeholder: 'https://',
    groupName: 'Contact Information',
  },
];

/**
 * Create system field definitions
 */
async function createSystemFields() {
  console.log('Creating system field definitions...');
  
  // Create talent fields
  for (let i = 0; i < talentFieldMappings.length; i++) {
    const mapping = talentFieldMappings[i];
    
    try {
      // Check if field already exists
      const existingField = await prisma.profileField.findFirst({
        where: { name: mapping.name },
      });
      
      if (existingField) {
        console.log(`Field ${mapping.name} already exists, skipping`);
        continue;
      }
      
      // Create the field
      const field = await prisma.profileField.create({
        data: {
          name: mapping.name,
          label: mapping.label,
          description: mapping.description,
          type: mapping.type,
          profileType: 'TALENT',
          isRequired: mapping.isRequired || false,
          isVisible: true,
          defaultValue: mapping.defaultValue,
          placeholder: mapping.placeholder,
          order: i + 1,
          groupName: mapping.groupName,
          isSystem: true,
        },
      });
      
      console.log(`Created field: ${field.name} (${field.id})`);
      
      // Create options for dropdown fields
      if (mapping.type === 'DROPDOWN' && mapping.options) {
        for (let j = 0; j < mapping.options.length; j++) {
          const option = mapping.options[j];
          
          await prisma.fieldOption.create({
            data: {
              value: option.value,
              label: option.label,
              color: option.color,
              order: option.order || j + 1,
              isDefault: option.isDefault || false,
              fieldId: field.id,
            },
          });
        }
        
        console.log(`Created ${mapping.options.length} options for ${field.name}`);
      }
    } catch (error) {
      console.error(`Error creating field ${mapping.name}:`, error);
    }
  }
  
  // Create studio fields
  for (let i = 0; i < studioFieldMappings.length; i++) {
    const mapping = studioFieldMappings[i];
    
    try {
      // Check if field already exists
      const existingField = await prisma.profileField.findFirst({
        where: { name: mapping.name },
      });
      
      if (existingField) {
        console.log(`Field ${mapping.name} already exists, skipping`);
        continue;
      }
      
      // Create the field
      const field = await prisma.profileField.create({
        data: {
          name: mapping.name,
          label: mapping.label,
          description: mapping.description,
          type: mapping.type,
          profileType: 'STUDIO',
          isRequired: mapping.isRequired || false,
          isVisible: true,
          defaultValue: mapping.defaultValue,
          placeholder: mapping.placeholder,
          order: i + 1,
          groupName: mapping.groupName,
          isSystem: true,
        },
      });
      
      console.log(`Created field: ${field.name} (${field.id})`);
      
      // Create options for dropdown fields
      if (mapping.type === 'DROPDOWN' && mapping.options) {
        for (let j = 0; j < mapping.options.length; j++) {
          const option = mapping.options[j];
          
          await prisma.fieldOption.create({
            data: {
              value: option.value,
              label: option.label,
              color: option.color,
              order: option.order || j + 1,
              isDefault: option.isDefault || false,
              fieldId: field.id,
            },
          });
        }
        
        console.log(`Created ${mapping.options.length} options for ${field.name}`);
      }
    } catch (error) {
      console.error(`Error creating field ${mapping.name}:`, error);
    }
  }
}

/**
 * Migrate talent profile data
 */
async function migrateTalentProfiles() {
  console.log('Migrating talent profile data...');
  
  // Get all talent profiles
  const profiles = await prisma.profile.findMany();
  console.log(`Found ${profiles.length} talent profiles to migrate`);
  
  // Get field definitions
  const fields = await prisma.profileField.findMany({
    where: { 
      profileType: 'TALENT',
      isSystem: true 
    },
  });
  
  // Create a map of field names to IDs
  const fieldMap = new Map();
  fields.forEach(field => {
    fieldMap.set(field.name, field.id);
  });
  
  // For each profile
  for (const profile of profiles) {
    console.log(`Migrating profile ${profile.id}...`);
    
    // For each field mapping
    for (const mapping of talentFieldMappings) {
      const fieldId = fieldMap.get(mapping.name);
      
      if (!fieldId) {
        console.warn(`Field ${mapping.name} not found in database, skipping`);
        continue;
      }
      
      // Get the value from the profile
      const value = profile[mapping.name];
      
      // Skip null/undefined values
      if (value === null || value === undefined) {
        continue;
      }
      
      // For boolean fields, convert to string
      const stringValue = typeof value === 'boolean' 
        ? value.toString() 
        : value;
      
      try {
        // Check if a value already exists
        const existingValue = await prisma.profileFieldValue.findUnique({
          where: {
            profileId_fieldId: {
              profileId: profile.id,
              fieldId,
            },
          },
        });
        
        if (existingValue) {
          console.log(`Value for ${mapping.name} already exists, updating`);
          
          // Update existing value
          await prisma.profileFieldValue.update({
            where: { id: existingValue.id },
            data: { value: stringValue },
          });
        } else {
          // Create new value
          await prisma.profileFieldValue.create({
            data: {
              profileId: profile.id,
              fieldId,
              value: stringValue,
            },
          });
        }
      } catch (error) {
        console.error(`Error migrating ${mapping.name} for profile ${profile.id}:`, error);
      }
    }
  }
}

/**
 * Migrate studio data
 */
async function migrateStudios() {
  console.log('Migrating studio data...');
  
  // Get all studios
  const studios = await prisma.studio.findMany();
  console.log(`Found ${studios.length} studios to migrate`);
  
  // Get field definitions
  const fields = await prisma.profileField.findMany({
    where: { 
      profileType: 'STUDIO',
      isSystem: true 
    },
  });
  
  // Create a map of field names to IDs
  const fieldMap = new Map();
  fields.forEach(field => {
    fieldMap.set(field.name, field.id);
  });
  
  // For each studio
  for (const studio of studios) {
    console.log(`Migrating studio ${studio.id}...`);
    
    // For each field mapping
    for (const mapping of studioFieldMappings) {
      const fieldId = fieldMap.get(mapping.name);
      
      if (!fieldId) {
        console.warn(`Field ${mapping.name} not found in database, skipping`);
        continue;
      }
      
      // Get the value from the studio
      const value = studio[mapping.name];
      
      // Skip null/undefined values
      if (value === null || value === undefined) {
        continue;
      }
      
      try {
        // Check if a value already exists
        const existingValue = await prisma.studioFieldValue.findUnique({
          where: {
            studioId_fieldId: {
              studioId: studio.id,
              fieldId,
            },
          },
        });
        
        if (existingValue) {
          console.log(`Value for ${mapping.name} already exists, updating`);
          
          // Update existing value
          await prisma.studioFieldValue.update({
            where: { id: existingValue.id },
            data: { value },
          });
        } else {
          // Create new value
          await prisma.studioFieldValue.create({
            data: {
              studioId: studio.id,
              fieldId,
              value,
            },
          });
        }
      } catch (error) {
        console.error(`Error migrating ${mapping.name} for studio ${studio.id}:`, error);
      }
    }
  }
}

/**
 * Run the migration
 */
async function runMigration() {
  try {
    // Create system fields
    await createSystemFields();
    
    // Migrate talent profiles
    await migrateTalentProfiles();
    
    // Migrate studios
    await migrateStudios();
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();