import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

// In-memory feature flags for prototyping 
// This will be replaced with database models when the schema is updated
const featureFlagsMap = new Map<string, any>();

/**
 * API route to manage feature flags
 * Only accessible to super admins
 */
export async function GET() {
  try {
    const session = await auth();
    
    // Check if user is super admin
    if (!session?.user?.id || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Return the in-memory feature flags for now
    const featureFlags = Array.from(featureFlagsMap.values());
    
    // If no flags yet, return some defaults
    if (featureFlags.length === 0) {
      return NextResponse.json([
        {
          id: 'ff1',
          key: 'multi_project_management',
          name: 'Multi-Project Management',
          description: 'Allow management of multiple projects simultaneously',
          defaultValue: false,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'ff2',
          key: 'custom_questionnaires',
          name: 'Custom Questionnaires',
          description: 'Create and distribute custom questionnaires to talents',
          defaultValue: false,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'ff3',
          key: 'unlimited_messaging',
          name: 'Unlimited Messaging',
          description: 'Send unlimited messages to talents and studios',
          defaultValue: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);
    }
    
    return NextResponse.json(featureFlags);
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feature flags' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    // Check if user is super admin
    if (!session?.user?.id || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Parse request body
    const data = await request.json();
    const { key, name, description, defaultValue } = data;
    
    // Validate required fields
    if (!key || !name) {
      return NextResponse.json(
        { error: 'Key and name are required fields' },
        { status: 400 }
      );
    }
    
    // Check if feature flag with this key already exists
    if (featureFlagsMap.has(key)) {
      return NextResponse.json(
        { error: 'Feature flag with this key already exists' },
        { status: 409 }
      );
    }
    
    // Create new feature flag
    const featureFlag = {
      id: `ff_${Date.now()}`,
      key,
      name,
      description,
      defaultValue: defaultValue ?? false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Store in our in-memory map
    featureFlagsMap.set(key, featureFlag);
    
    return NextResponse.json(featureFlag, { status: 201 });
  } catch (error) {
    console.error('Error creating feature flag:', error);
    return NextResponse.json(
      { error: 'Failed to create feature flag' },
      { status: 500 }
    );
  }
}