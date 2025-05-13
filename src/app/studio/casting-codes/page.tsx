'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import CastingCodeManager from '@/components/CastingCodeManager';

export default function CastingCodesPage() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  
  useEffect(() => {
    // Redirect if not authenticated or not a studio
    if (status === 'unauthenticated') {
      redirect('/sign-in');
    }
    
    if (status === 'authenticated' && session?.user?.tenantType !== 'STUDIO') {
      redirect('/talent/dashboard');
    }
    
    // Fetch projects for dropdown
    async function fetchProjects() {
      if (status !== 'authenticated') return;
      
      try {
        const response = await fetch('/api/studio/projects');
        
        if (response.ok) {
          const data = await response.json();
          setProjects(data);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchProjects();
  }, [status, session]);
  
  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Casting Codes</h1>
      
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <p className="text-gray-600 mb-4">
          Create and manage QR codes for quick talent casting submissions. 
          Share these codes with talent at auditions, events, or include them in promotional materials.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-blue-50 p-3 rounded">
            <span className="font-medium">Quick Submissions</span>
            <p>Allow talent to submit their information without needing a platform account</p>
          </div>
          
          <div className="bg-green-50 p-3 rounded">
            <span className="font-medium">Custom Surveys</span>
            <p>Add custom questions to collect the exact information you need</p>
          </div>
          
          <div className="bg-purple-50 p-3 rounded">
            <span className="font-medium">QR Code Sharing</span>
            <p>Generate QR codes that talent can scan with their phone camera</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg p-6">
        <CastingCodeManager projects={projects} />
      </div>
    </div>
  );
}