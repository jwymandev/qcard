import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get user profile
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Get profile
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });
    
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    
    // List all fields directly from the profile to verify what's in the DB
    const profileFields = Object.keys(profile);
    const fieldsWithTypes = {};
    
    // Create a map of fields and their types
    profileFields.forEach(field => {
      fieldsWithTypes[field] = typeof profile[field];
    });
    
    return NextResponse.json({
      message: "Profile schema test",
      profile_id: profile.id,
      available_fields: profileFields,
      field_types: fieldsWithTypes,
      // Show a sample of the field values where not null
      sample_values: Object.fromEntries(
        Object.entries(profile)
          .filter(([_, value]) => value !== null)
          .map(([key, value]) => [key, String(value).substring(0, 50)])
      )
    });
  } catch (error) {
    console.error("Error testing profile schema:", error);
    return NextResponse.json({ 
      error: "Failed to test profile schema",
      details: error.toString(),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}