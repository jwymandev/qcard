'use client';

import React from 'react';
import Link from 'next/link';

export default function StudioSignup() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Join as Studio</h1>
      
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Create Your Studio Account</h2>
        
        <div className="space-y-6">
          <p className="text-gray-600">
            Join our platform to find the perfect extras for your production based on specific criteria and casting needs.
          </p>
          
          <div className="bg-green-50 p-4 rounded-md">
            <h3 className="font-medium text-lg mb-2">Benefits for Studios</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Access a large database of available talent</li>
              <li>Advanced search filters to find the right extras</li>
              <li>Custom pricing based on your production needs</li>
              <li>Manage multiple productions simultaneously</li>
              <li>Direct communication with talent</li>
            </ul>
          </div>
          
          <div className="flex justify-between items-center border-t pt-6">
            <Link 
              href="/"
              className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50 transition"
            >
              Back to Home
            </Link>
            
            <Link 
              href="/sign-up"
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            >
              Continue to Signup
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}