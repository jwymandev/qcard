import React from 'react';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import CastingCodeApplicationForm from '@/components/CastingCodeApplicationForm';

// Add metadata
export const metadata = {
  title: 'Apply to Casting Call',
  description: 'Apply to a casting call using a casting code',
};

// This is a server component that will fetch the casting code data
export default async function ApplyWithCodePage({
  params,
}: {
  params: { code: string };
}) {
  const { code } = params;
  
  if (!code) {
    notFound();
  }
  
  // Fetch the casting code from the database
  const castingCode = await prisma.castingCode.findUnique({
    where: { code },
    include: {
      studio: {
        select: {
          id: true,
          name: true,
          description: true,
          contactName: true,
          contactEmail: true,
          website: true,
        },
      },
      project: {
        select: {
          id: true,
          title: true,
          description: true,
        },
      },
    },
  });
  
  // If code doesn't exist, is inactive, or has expired
  if (
    !castingCode ||
    !castingCode.isActive ||
    (castingCode.expiresAt && castingCode.expiresAt < new Date())
  ) {
    notFound();
  }
  
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Apply to {castingCode.studio.name}</h1>
        {castingCode.project && (
          <h2 className="text-xl text-muted-foreground">
            Project: {castingCode.project.title}
          </h2>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h3 className="text-xl font-semibold mb-4">{castingCode.name}</h3>
        
        {castingCode.description && (
          <div className="mb-6 text-muted-foreground">
            <p>{castingCode.description}</p>
          </div>
        )}
        
        {castingCode.project?.description && (
          <div className="mb-6">
            <h4 className="text-md font-semibold mb-2">About the Project</h4>
            <p className="text-sm text-muted-foreground">{castingCode.project.description}</p>
          </div>
        )}
        
        <div className="mb-6">
          <h4 className="text-md font-semibold mb-2">About {castingCode.studio.name}</h4>
          {castingCode.studio.description && (
            <p className="text-sm text-muted-foreground mb-2">{castingCode.studio.description}</p>
          )}
          <div className="text-sm mt-4">
            {castingCode.studio.contactName && (
              <p><span className="font-semibold">Contact:</span> {castingCode.studio.contactName}</p>
            )}
            {castingCode.studio.contactEmail && (
              <p>
                <span className="font-semibold">Email:</span>{' '}
                <a 
                  href={`mailto:${castingCode.studio.contactEmail}`}
                  className="text-blue-600 hover:underline"
                >
                  {castingCode.studio.contactEmail}
                </a>
              </p>
            )}
            {castingCode.studio.website && (
              <p>
                <span className="font-semibold">Website:</span>{' '}
                <a 
                  href={castingCode.studio.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {castingCode.studio.website}
                </a>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-6">Your Information</h3>
        <CastingCodeApplicationForm 
          code={code} 
          studioId={castingCode.studio.id}
          surveyFields={castingCode.surveyFields}
        />
      </div>
    </div>
  );
}