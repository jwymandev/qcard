'use client';

import React from 'react';
import Link from 'next/link';

export default function Onboarding() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Welcome to QCard!</h1>
      
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Complete Your Profile</h2>
        
        <div className="space-y-6">
          <p className="text-gray-600">
            Let&apos;s set up your account to help you get the most out of QCard. Please select what type of account you&apos;d like to create:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="border rounded-lg p-5 hover:border-blue-500 cursor-pointer transition">
              <h3 className="font-medium text-lg mb-2">Talent Account</h3>
              <p className="text-gray-600 mb-4">
                Create a profile to showcase your skills and get discovered for casting opportunities.
              </p>
              <Link 
                href="/profile"
                className="text-blue-600 hover:text-blue-800"
              >
                Continue as Talent →
              </Link>
            </div>
            
            <div className="border rounded-lg p-5 hover:border-green-500 cursor-pointer transition">
              <h3 className="font-medium text-lg mb-2">Studio Account</h3>
              <p className="text-gray-600 mb-4">
                Set up your studio profile to find talent for your productions.
              </p>
              <Link 
                href="/studio/profile"
                className="text-green-600 hover:text-green-800"
              >
                Continue as Studio →
              </Link>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t">
            <Link 
              href="/dashboard"
              className="text-gray-600 hover:text-gray-800"
            >
              Skip for now and go to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}