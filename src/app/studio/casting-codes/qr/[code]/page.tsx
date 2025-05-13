'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect, useParams, useRouter } from 'next/navigation';
import { Button, Card } from '@/components/ui';
import SimpleCastingCodeQRDisplay from '@/components/SimpleCastingCodeQRDisplay';

export default function CastingCodeQRPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [castingCode, setCastingCode] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const code = typeof params.code === 'string' ? params.code : '';
  
  useEffect(() => {
    // Redirect if not authenticated or not a studio
    if (status === 'unauthenticated') {
      redirect('/sign-in');
    }
    
    if (status === 'authenticated' && session?.user?.tenantType !== 'STUDIO') {
      redirect('/talent/dashboard');
    }
    
    async function fetchCastingCode() {
      if (!code || status !== 'authenticated') return;
      
      try {
        setLoading(true);
        setError(null);
        
        // For now, just use the code directly
        setCastingCode({
          code: code,
          name: 'Casting Code',
        });
      } catch (error) {
        console.error('Error fetching casting code:', error);
        setError('Error loading casting code');
      } finally {
        setLoading(false);
      }
    }
    
    fetchCastingCode();
  }, [code, status, session]);
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">QR Code: {code}</h1>
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">Loading...</div>
      ) : error ? (
        <Card className="p-6 text-center text-red-600">{error}</Card>
      ) : (
        <div className="bg-white shadow rounded-lg p-6">
          <SimpleCastingCodeQRDisplay castingCode={code} />
          
          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-medium mb-4">Instructions</h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Share this QR code with talent at auditions, meetings, or events</li>
              <li>Talent can scan the code with their phone camera to access the submission form</li>
              <li>They can fill out their information and any survey questions you&apos;ve added</li>
              <li>View submissions in the Casting Code Submissions section</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}