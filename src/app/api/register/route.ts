import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";
import crypto from "crypto";

// Validation schema for registration
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phoneNumber: z.string().optional(),
  userType: z.enum(["TALENT", "STUDIO"]),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validate input data
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input data", details: result.error.flatten() },
        { status: 400 }
      );
    }
    
    const { email, password, firstName, lastName, phoneNumber, userType } = result.data;
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create tenant first
    const tenant = await prisma.tenant.create({
      data: {
        id: crypto.randomUUID(),
        name: `${firstName} ${lastName}`,
        type: userType,
        updatedAt: new Date()
      },
    });
    
    // Create user with reference to tenant
    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phoneNumber,
        tenantId: tenant.id,
        updatedAt: new Date()
      },
    });
    
    // Create profile based on user type
    if (userType === "TALENT") {
      await prisma.profile.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          availability: true, // Default to available
          updatedAt: new Date()
        },
      });
    } else if (userType === "STUDIO") {
      // Create a studio record automatically
      const studioName = `${firstName} ${lastName}`.trim() || 'New Studio';
      await prisma.studio.create({
        data: {
          id: crypto.randomUUID(),
          name: studioName,
          tenantId: tenant.id,
          description: `Studio for ${studioName}`,
          updatedAt: new Date()
        },
      });
    }
    
    // Return user data (exclude password)
    return NextResponse.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      tenantId: user.tenantId,
      tenantType: userType,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { 
        error: "An error occurred during registration",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}