'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import SimpleQRCode from '@/components/SimpleQRCode';
import { Button, Input } from '@/components/ui';

export default function QRTestPage() {
  const { data: session, status } = useSession();
  const [text, setText] = useState('https://qcard.app/test');
  
  // Basic auth check
  if (status === 'unauthenticated') {
    redirect('/sign-in');
  }
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">QR Code Test Page</h1>
      
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <p className="text-gray-600 mb-4">
          This page tests the QR code generation functionality directly, bypassing the API.
        </p>
        
        <div className="flex space-x-2 mb-6">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text for QR code"
            className="flex-1"
          />
          <Button 
            onClick={() => setText('https://qcard.app/test-' + Math.random().toString(36).substring(2, 7))}
          >
            Generate Random
          </Button>
        </div>
        
        <SimpleQRCode text={text} />
      </div>
    </div>
  );
}