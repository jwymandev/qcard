'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Studio {
  id: string;
  name: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  tenantId: string;
  createdAt: string;
  projectCount: number;
  castingCallCount: number;
}

export default function StudiosPage() {
  const [studios, setStudios] = useState<Studio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchStudios() {
      try {
        setLoading(true);
        
        // Build search parameters
        const params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        
        // Check admin access first
        const accessCheck = await fetch('/api/admin/check-access');
        if (!accessCheck.ok) {
          console.error('Admin access check failed:', await accessCheck.text());
          setError('You do not have admin permissions to view studios');
          setLoading(false);
          return;
        }
        
        // Fetch studios from API
        const response = await fetch(`/api/admin/studios?${params.toString()}`, {
          credentials: 'include' // Important for auth cookies
        });
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Received studio data:', data);
        
        if (data.studios && Array.isArray(data.studios)) {
          setStudios(data.studios);
        } else {
          console.warn('No studios array in response:', data);
          setStudios([]);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching studios:', error);
        setError('Failed to load studios');
        setLoading(false);
      }
    }

    fetchStudios();
  }, [searchTerm]);

  // Filter studios based on search term
  const filteredStudios = studios.filter(studio => {
    return (
      studio.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      studio.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      studio.contactEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4 md:mb-0">Studio Management</h1>
        <Link 
          href="/admin/users/new?type=STUDIO" 
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          Add New Studio
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="relative">
            <input
              type="text"
              placeholder="Search studios..."
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <svg
                className="h-5 w-5 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Studio Cards */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="border rounded-lg p-4 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))
          ) : error ? (
            <div className="col-span-3 bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
              {error}
            </div>
          ) : filteredStudios.length === 0 ? (
            <div className="col-span-3 text-center py-8 text-gray-500">
              No studios found matching your search criteria.
            </div>
          ) : (
            filteredStudios.map((studio) => (
              <Link key={studio.id} href={`/admin/studios/${studio.id}`}>
                <div className="border rounded-lg p-5 hover:shadow-md transition-shadow">
                  <h2 className="text-lg font-medium text-gray-900 mb-1">{studio.name}</h2>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{studio.description}</p>
                  
                  <div className="flex flex-col space-y-1 mb-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                      </svg>
                      {studio.contactEmail}
                    </div>
                    {studio.contactPhone && (
                      <div className="flex items-center text-sm text-gray-500">
                        <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                        </svg>
                        {studio.contactPhone}
                      </div>
                    )}
                    {studio.website && (
                      <div className="flex items-center text-sm text-gray-500">
                        <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        {studio.website.replace(/^https?:\/\//, '')}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t">
                    <div className="text-xs text-gray-500">
                      Created {new Date(studio.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex space-x-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {studio.projectCount} Projects
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {studio.castingCallCount} Calls
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}