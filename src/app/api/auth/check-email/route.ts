import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * API endpoint to check if an email exists in the database
 * Used by the sign-in page to provide more helpful error messages
 */
export async function GET(request: Request) {
  try {
    // Get email from query string
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({ 
        error: "Email parameter is required" 
      }, { status: 400 });
    }
    
    console.log(`Checking if email exists: ${email}`);
    
    // Check if the email exists with exact match
    let user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true }
    });
    
    // If not found, try case-insensitive search
    if (!user) {
      console.log(`No exact match for ${email}, trying case-insensitive search`);
      
      try {
        // Try with Prisma's built-in case insensitivity
        user = await prisma.user.findFirst({
          where: { email: { mode: 'insensitive', equals: email } },
          select: { id: true, email: true }
        });
      } catch (e) {
        // Fallback to manual case-insensitive search if database doesn't support it
        console.log(`Case-insensitive query failed, trying manual search`);
        
        const users = await prisma.user.findMany({
          take: 100, // Limit to 100 users for performance
          select: { id: true, email: true }
        });
        
        const matchingUser = users.find(u => 
          u.email.toLowerCase() === email.toLowerCase()
        );
        
        if (matchingUser) {
          user = matchingUser;
        }
      }
    }
    
    // Return result with actual email if found (for case correction)
    return NextResponse.json({
      exists: !!user,
      email: user ? user.email : null
    });
  } catch (error) {
    console.error("Error checking email:", error);
    // Return true by default to avoid exposing user existence through errors
    // This means the client will show "incorrect password" instead of "user not found"
    // which is safer from a security perspective
    return NextResponse.json({ 
      exists: true,
      error: "Error checking email"
    });
  }
}