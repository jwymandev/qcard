import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * API endpoint to check if a user exists by email
 * Used by the sign-in page to provide more specific error messages
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }
    
    // Simple check to see if the user exists
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true } // Only select ID to minimize data returned
    });
    
    // Return true/false without exposing sensitive information
    return NextResponse.json({ exists: !!user });
  } catch (error) {
    console.error("Error checking email:", error);
    // Return false on error to avoid leaking information
    return NextResponse.json({ exists: false });
  }
}