'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This is a helper page that just redirects to the actual casting call detail page
export default function ProjectCastingCallRedirect({ params }: { params: { id: string, callId: string } }) {
  const router = useRouter();
  const { id: projectId, callId } = params;
  
  useEffect(() => {
    router.push(`/studio/casting-calls/${callId}`);
  }, [router, callId]);
  
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}