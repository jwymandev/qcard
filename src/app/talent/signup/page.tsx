'use client';

import React from 'react';
import Link from 'next/link';

export default function TalentSignup() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Join as Talent</h1>
      
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Create Your Talent Account</h2>
        
        <div className="space-y-6">
          <p className="text-gray-600">
            Join our platform to showcase your skills and get discovered by top studios for video and movie productions.
          </p>
          
          <div className="bg-blue-50 p-4 rounded-md">
            <h3 className="font-medium text-lg mb-2">Benefits of Joining</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Create a professional casting profile</li>
              <li>Get discovered by casting directors and production companies</li>
              <li>Access exclusive casting opportunities</li>
              <li>Select your preferred filming locations</li>
              <li>Flexible subscription plans based on your needs</li>
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
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Continue to Signup
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}