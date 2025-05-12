import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Schema for validating submission data
const castingSubmissionSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  message: z.string().optional(),
  code: z.string().min(1, { message: "Casting code is required" }),
  createAccount: z.boolean().optional().default(false),
  surveyResponses: z.record(z.string(), z.any()).optional(),
});

// POST - Submit application via casting code
export async function POST(request: Request) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = castingSubmissionSchema.parse(body);
    
    // Retrieve the casting code
    const castingCode = await prisma.castingCode.findUnique({
      where: { code: validatedData.code },
      include: {
        studio: true,
        project: true,
      },
    });
    
    if (!castingCode) {
      return NextResponse.json(
        { error: 'Invalid casting code' },
        { status: 404 }
      );
    }
    
    // Check if the code is active
    if (!castingCode.isActive) {
      return NextResponse.json(
        { error: 'This casting code is no longer active' },
        { status: 400 }
      );
    }
    
    // Check if the code has expired
    if (castingCode.expiresAt && castingCode.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This casting code has expired' },
        { status: 400 }
      );
    }
    
    // Create a new external actor if the person doesn't exist yet
    let externalActor = null;
    
    // Check if this person already exists as an external actor for this studio
    if (validatedData.email) {
      externalActor = await prisma.externalActor.findFirst({
        where: {
          email: validatedData.email,
          studioId: castingCode.studioId,
        },
      });
    }
    
    // If not found by email, try to match by name
    if (!externalActor) {
      externalActor = await prisma.externalActor.findFirst({
        where: {
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          studioId: castingCode.studioId,
        },
      });
    }
    
    // If we still don't have an external actor, create one
    if (!externalActor) {
      externalActor = await prisma.externalActor.create({
        data: {
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          email: validatedData.email,
          phoneNumber: validatedData.phoneNumber,
          studioId: castingCode.studioId,
          status: 'ACTIVE',
          updatedAt: new Date(),
        },
      });
    } else {
      // Update existing external actor with any new information
      externalActor = await prisma.externalActor.update({
        where: { id: externalActor.id },
        data: {
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          email: validatedData.email || externalActor.email,
          phoneNumber: validatedData.phoneNumber || externalActor.phoneNumber,
          updatedAt: new Date(),
        },
      });
    }
    
    // Create the casting submission
    const submission = await prisma.castingSubmission.create({
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        phoneNumber: validatedData.phoneNumber,
        message: validatedData.message,
        castingCodeId: castingCode.id,
        externalActorId: externalActor.id,
        status: 'PENDING',
        updatedAt: new Date(),
      },
    });
    
    // Process survey responses if they exist
    if (validatedData.surveyResponses && Object.keys(validatedData.surveyResponses).length > 0 && castingCode.surveyFields) {
      // Create survey response record
      await prisma.castingSubmissionSurvey.create({
        data: {
          submissionId: submission.id,
          responses: validatedData.surveyResponses,
          updatedAt: new Date(),
        },
      });
    }
    
    // Add this external actor to the project if there is one
    if (castingCode.projectId) {
      // Check if the external actor is already in this project
      const existingProjectAssociation = await prisma.externalActorProject.findFirst({
        where: {
          externalActorId: externalActor.id,
          projectId: castingCode.projectId,
        },
      });
      
      if (!existingProjectAssociation) {
        // Add the external actor to the project
        await prisma.externalActorProject.create({
          data: {
            externalActorId: externalActor.id,
            projectId: castingCode.projectId,
            updatedAt: new Date(),
          },
        });
      }
    }
    
    // If the user wants to create an account, we'll handle that separately
    // This would involve sending an invitation email or generating a signup link
    // For now, we'll just mark that they requested an account in the response
    
    return NextResponse.json({
      success: true,
      message: "Your submission has been received successfully!",
      submissionId: submission.id,
      createAccount: validatedData.createAccount,
    });
  } catch (error) {
    console.error('Error processing casting submission:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.format() },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to process submission' },
      { status: 500 }
    );
  }
}