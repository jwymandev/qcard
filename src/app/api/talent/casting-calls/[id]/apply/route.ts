import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';
import crypto from 'crypto';

// Validation schema for submitting an application
const applicationSchema = z.object({
  message: z.string().min(10, { message: "Message must be at least 10 characters" }).max(1000, { message: "Message must be less than 1000 characters" }),
});

// POST /api/talent/casting-calls/[id]/apply - Apply to a casting call
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const castingCallId = params.id;
    const body = await request.json();

    // Validate input data
    const result = applicationSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input data", details: result.error.format() },
        { status: 400 }
      );
    }

    const validatedData = result.data;

    // Find the user and check if they have a talent profile
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        Profile: true,
        regionSubscriptions: {
          where: {
            status: { in: ['ACTIVE', 'TRIALING'] }
          },
          include: {
            regionPlan: {
              include: {
                region: true
              }
            }
          }
        }
      },
    });

    if (!user?.Profile) {
      return NextResponse.json({ error: "Talent profile not found" }, { status: 404 });
    }

    // Check if the casting call exists and is open
    const castingCall = await prisma.castingCall.findUnique({
      where: { id: castingCallId },
      include: {
        Location: {
          include: {
            region: true
          }
        }
      }
    });

    if (!castingCall) {
      return NextResponse.json({ error: "Casting call not found" }, { status: 404 });
    }

    if (castingCall.status !== "OPEN") {
      return NextResponse.json({ error: "This casting call is no longer accepting applications" }, { status: 400 });
    }

    // NOTE: Subscription check removed to allow non-subscribers to apply to casting calls
    // Users will only need subscriptions for talent search/discovery features

    // Check if already applied
    const existingApplication = await prisma.application.findFirst({
      where: {
        castingCallId,
        profileId: user.Profile.id,
      },
    });

    if (existingApplication) {
      return NextResponse.json({ error: "You have already applied to this casting call" }, { status: 400 });
    }

    // Create the application
    const applicationId = crypto.randomUUID();
    const now = new Date();

    const application = await prisma.application.create({
      data: {
        id: applicationId,
        message: validatedData.message,
        profileId: user.Profile.id,
        castingCallId,
        createdAt: now,
        updatedAt: now,
      },
    });

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    console.error("Error applying to casting call:", error);
    return NextResponse.json({
      error: "Failed to submit application",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}