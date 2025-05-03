import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// Helper function to check if a user owns the image
async function userOwnsImage(userId: string, imageId: string) {
  const image = await prisma.profileImage.findUnique({
    where: { id: imageId },
    include: { Profile: { include: { User: true } } },
  });
  
  return image?.Profile?.User?.id === userId;
}

// PATCH /api/talent/profile/images/[id]/primary - Set an image as primary
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { id } = params;
    
    // Verify ownership
    if (!(await userOwnsImage(session.user.id, id))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    
    // Get the image
    const image = await prisma.profileImage.findUnique({
      where: { id },
      include: { Profile: true },
    });
    
    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }
    
    // First, unset primary status for all images in this profile
    await prisma.profileImage.updateMany({
      where: { profileId: image.profileId },
      data: { isPrimary: false },
    });
    
    // Set this image as primary
    await prisma.profileImage.update({
      where: { id },
      data: { isPrimary: true },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting primary image:", error);
    return NextResponse.json({ error: "Failed to set primary image" }, { status: 500 });
  }
}