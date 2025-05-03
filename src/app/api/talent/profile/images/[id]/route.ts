import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { unlink } from 'fs/promises';
import path from 'path';

// Helper function to check if a user owns the image
async function userOwnsImage(userId: string, imageId: string) {
  const image = await prisma.profileImage.findUnique({
    where: { id: imageId },
    include: { Profile: { include: { User: true } } },
  });
  
  return image?.Profile?.User?.id === userId;
}

// DELETE /api/talent/profile/images/[id] - Delete a profile image
export async function DELETE(
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
    
    // Get the image to delete
    const image = await prisma.profileImage.findUnique({
      where: { id },
    });
    
    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }
    
    // Delete the image file from the server
    try {
      const filePath = path.join(process.cwd(), 'public', image.url.replace(/^\//, ''));
      await unlink(filePath);
    } catch (error) {
      console.error("Error deleting file:", error);
      // Continue even if file deletion fails
    }
    
    // Check if this is a primary image
    const isPrimary = image.isPrimary;
    
    // Delete image from database
    await prisma.profileImage.delete({
      where: { id },
    });
    
    // If this was the primary image, set another image as primary
    if (isPrimary) {
      const profileImages = await prisma.profileImage.findMany({
        where: { profileId: image.profileId },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });
      
      if (profileImages.length > 0) {
        await prisma.profileImage.update({
          where: { id: profileImages[0].id },
          data: { isPrimary: true },
        });
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting image:", error);
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
}