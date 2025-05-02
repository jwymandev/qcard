'use client';

import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-4 text-blue-600">QCard</h1>
          <p className="text-2xl text-gray-700">A Casting Platform</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-10">
          <div className="p-8 border rounded-xl shadow-lg bg-white">
            <h2 className="text-3xl font-semibold mb-6 text-blue-600">For Talent</h2>
            <p className="mb-6 text-lg text-gray-600">
              Create your profile, showcase your skills, and get discovered by top studios for video and movie productions.
            </p>
            <ul className="mb-8 space-y-2 text-gray-600">
              <li className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Create a professional casting profile
              </li>
              <li className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Apply to exclusive casting calls
              </li>
              <li className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Get discovered by top production studios
              </li>
            </ul>
            <Link 
              href="/sign-up" 
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-center block"
            >
              Join as Talent
            </Link>
          </div>
          
          <div className="p-8 border rounded-xl shadow-lg bg-white">
            <h2 className="text-3xl font-semibold mb-6 text-green-600">For Studios</h2>
            <p className="mb-6 text-lg text-gray-600">
              Find the perfect extras for your production based on specific criteria and casting needs.
            </p>
            <ul className="mb-8 space-y-2 text-gray-600">
              <li className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Post targeted casting calls
              </li>
              <li className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Search talent with precision filters
              </li>
              <li className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Manage productions with an all-in-one tool
              </li>
            </ul>
            <Link 
              href="/sign-up" 
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-center block"
            >
              Join as Studio
            </Link>
          </div>
        </div>
        
        <div className="text-center mt-12">
          <p className="mb-4 text-gray-600">Already have an account?</p>
          <Link 
            href="/sign-in" 
            className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition font-medium"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}