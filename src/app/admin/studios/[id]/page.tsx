'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface StudioDetail {
  id: string;
  name: string;
  description: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  tenantId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  projects: {
    id: string;
    title: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
  }[];
  castingCalls: {
    id: string;
    title: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
  }[];
}

export default function StudioDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studioId = params.id as string;
  
  const [studio, setStudio] = useState<StudioDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStudio() {
      try {
        // In a real implementation, fetch from API
        // const response = await fetch(`/api/admin/studios/${studioId}`);
        // const data = await response.json();
        
        // For now, simulate API response
        setTimeout(() => {
          if (studioId === '404') {
            setError('Studio not found');
            setLoading(false);
            return;
          }
          
          // Simulate studio data
          const studioData: StudioDetail = {
            id: studioId,
            name: 'ABC Studios',
            description: 'Major film studio focused on independent productions. We create diverse content for global audiences.',
            contactName: 'John Smith',
            contactEmail: 'contact@abcstudios.com',
            contactPhone: '123-456-7890',
            website: 'https://abcstudios.com',
            tenantId: 'tenant1',
            userId: 'user1',
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-03-15T00:00:00Z',
            projects: [
              {
                id: 'p1',
                title: 'Summer Blockbuster',
                status: 'PRODUCTION',
                startDate: '2023-05-01T00:00:00Z',
                endDate: '2023-10-30T00:00:00Z',
              },
              {
                id: 'p2',
                title: 'Indie Drama',
                status: 'PLANNING',
                startDate: '2023-08-15T00:00:00Z',
                endDate: null,
              },
            ],
            castingCalls: [
              {
                id: 'c1',
                title: 'Lead Actor for Summer Blockbuster',
                status: 'OPEN',
                startDate: '2023-04-01T00:00:00Z',
                endDate: '2023-04-30T00:00:00Z',
              },
              {
                id: 'c2',
                title: 'Supporting Cast for Indie Drama',
                status: 'DRAFT',
                startDate: null,
                endDate: null,
              },
            ],
          };
          
          setStudio(studioData);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error fetching studio details:', error);
        setError('Failed to load studio details');
        setLoading(false);
      }
    }

    fetchStudio();
  }, [studioId]);

  const handleDeleteStudio = () => {
    if (window.confirm('Are you sure you want to delete this studio? This action cannot be undone and will affect all associated projects and casting calls.')) {
      // In a real implementation, call API
      alert('Studio deletion functionality would go here.');
      router.push('/admin/studios');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !studio) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
        <p>{error || 'Studio not found'}</p>
        <Link href="/admin/studios" className="text-red-700 font-medium underline mt-2 inline-block">
          Return to studios list
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <Link 
            href="/admin/studios"
            className="inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            ← Back to Studios
          </Link>
          <h1 className="text-2xl font-semibold text-gray-800 mt-2">{studio.name}</h1>
        </div>
        <div className="flex space-x-3">
          <Link
            href={`/admin/studios/${studioId}/edit`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Edit Studio
          </Link>
          <button
            onClick={handleDeleteStudio}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
          >
            Delete Studio
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="bg-white shadow overflow-hidden rounded-lg mb-6">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Studio Details</h3>
            </div>
            <div className="border-t border-gray-200">
              <dl>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Studio name</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{studio.name}</dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Description</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{studio.description}</dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Contact name</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{studio.contactName || '-'}</dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Contact email</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <a href={`mailto:${studio.contactEmail}`} className="text-blue-600 hover:text-blue-800">
                      {studio.contactEmail || '-'}
                    </a>
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Contact phone</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{studio.contactPhone || '-'}</dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Website</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {studio.website ? (
                      <a href={studio.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                        {studio.website}
                      </a>
                    ) : '-'}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Created at</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {new Date(studio.createdAt).toLocaleString()}
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Updated at</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {new Date(studio.updatedAt).toLocaleString()}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Projects Section */}
          <div className="bg-white shadow overflow-hidden rounded-lg mb-6">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Projects</h3>
              <Link 
                href={`/admin/studios/${studioId}/projects/new`}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Add Project
              </Link>
            </div>
            <div className="divide-y divide-gray-200">
              {studio.projects.length === 0 ? (
                <div className="px-4 py-5 text-center text-gray-500">
                  No projects found for this studio.
                </div>
              ) : (
                studio.projects.map((project) => (
                  <div key={project.id} className="px-4 py-4 hover:bg-gray-50">
                    <Link href={`/admin/projects/${project.id}`} className="flex justify-between items-center">
                      <div>
                        <h4 className="text-md font-medium text-gray-900">{project.title}</h4>
                        <div className="flex items-center mt-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${project.status === 'PRODUCTION' ? 'bg-green-100 text-green-800' : 
                              project.status === 'PLANNING' ? 'bg-blue-100 text-blue-800' :
                              project.status === 'COMPLETED' ? 'bg-gray-100 text-gray-800' :
                              'bg-yellow-100 text-yellow-800'}`}>
                            {project.status}
                          </span>
                          
                          {project.startDate && (
                            <span className="ml-2 text-xs text-gray-500">
                              {new Date(project.startDate).toLocaleDateString()}
                              {project.endDate && ` - ${new Date(project.endDate).toLocaleDateString()}`}
                            </span>
                          )}
                        </div>
                      </div>
                      <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Casting Calls Section */}
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Casting Calls</h3>
              <Link 
                href={`/admin/studios/${studioId}/casting-calls/new`}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Add Casting Call
              </Link>
            </div>
            <div className="divide-y divide-gray-200">
              {studio.castingCalls.length === 0 ? (
                <div className="px-4 py-5 text-center text-gray-500">
                  No casting calls found for this studio.
                </div>
              ) : (
                studio.castingCalls.map((call) => (
                  <div key={call.id} className="px-4 py-4 hover:bg-gray-50">
                    <Link href={`/admin/casting-calls/${call.id}`} className="flex justify-between items-center">
                      <div>
                        <h4 className="text-md font-medium text-gray-900">{call.title}</h4>
                        <div className="flex items-center mt-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${call.status === 'OPEN' ? 'bg-green-100 text-green-800' : 
                              call.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                              call.status === 'CLOSED' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'}`}>
                            {call.status}
                          </span>
                          
                          {call.startDate && (
                            <span className="ml-2 text-xs text-gray-500">
                              {new Date(call.startDate).toLocaleDateString()}
                              {call.endDate && ` - ${new Date(call.endDate).toLocaleDateString()}`}
                            </span>
                          )}
                        </div>
                      </div>
                      <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="space-y-6">
          {/* User Account Info */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Account Info</h3>
            </div>
            <div className="px-4 py-5">
              <Link 
                href={`/admin/users/${studio.userId}`}
                className="text-blue-600 hover:text-blue-800 flex items-center"
              >
                <svg className="mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                View User Account
              </Link>
              <div className="mt-2 text-sm text-gray-500">
                <p>Tenant ID: {studio.tenantId}</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Quick Actions</h3>
            </div>
            <div className="p-4 space-y-2">
              <button className="w-full text-left py-2 px-3 rounded hover:bg-gray-100 text-sm flex items-center">
                <svg className="mr-2 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                Send Message
              </button>
              <button className="w-full text-left py-2 px-3 rounded hover:bg-gray-100 text-sm flex items-center">
                <svg className="mr-2 h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                  <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                </svg>
                Manage Subscription
              </button>
              <button className="w-full text-left py-2 px-3 rounded hover:bg-gray-100 text-sm flex items-center">
                <svg className="mr-2 h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z" clipRule="evenodd" />
                </svg>
                Export Studio Data
              </button>
              <button className="w-full text-left py-2 px-3 rounded hover:bg-gray-100 text-sm text-red-600 flex items-center">
                <svg className="mr-2 h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zm-.894 1.106l.894.447h2l.894-.447-.894-1.106h-2l-.894 1.106zM10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                Suspend Studio
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}