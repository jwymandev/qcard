'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert, AlertTitle, AlertDescription, Spinner } from '@/components/ui';

type Application = {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  message?: string;
  createdAt: string;
  updatedAt: string;
  CastingCall: {
    id: string;
    title: string;
    description: string;
    compensation?: string;
    startDate?: string;
    endDate?: string;
    Studio?: {
      id: string;
      name: string;
    };
    Project?: {
      id: string;
      title: string;
    };
  };
};

export default function TalentApplicationsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  
  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchApplications();
    } else if (authStatus === 'unauthenticated') {
      router.push('/sign-in');
    }
  }, [authStatus]);
  
  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/talent/casting-calls');
      
      if (response.ok) {
        const castingCalls = await response.json();
        
        // Extract applications from casting calls
        const allApplications: Application[] = [];
        castingCalls.forEach((call: any) => {
          if (call.applications) {
            call.applications.forEach((app: any) => {
              allApplications.push({
                ...app,
                CastingCall: {
                  id: call.id,
                  title: call.title,
                  description: call.description,
                  compensation: call.compensation,
                  startDate: call.startDate,
                  endDate: call.endDate,
                  Studio: call.Studio,
                  Project: call.Project,
                },
              });
            });
          }
        });
        
        // Sort applications by creation date (newest first)
        allApplications.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        setApplications(allApplications);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch applications');
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError('Network error occurred while fetching applications');
    } finally {
      setLoading(false);
    }
  };
  
  const filteredApplications = applications.filter(app => {
    if (filter === 'all') return true;
    return app.status.toLowerCase() === filter;
  });
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (authStatus === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <Spinner className="w-10 h-10 mb-4" />
          <p>Loading your applications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <button 
            onClick={fetchApplications}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Applications</h1>
        <Link
          href="/opportunities"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Browse Opportunities
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex space-x-4 mb-6">
        {['all', 'pending', 'approved', 'rejected'].map((filterOption) => (
          <button
            key={filterOption}
            onClick={() => setFilter(filterOption as any)}
            className={`px-4 py-2 rounded-md font-medium capitalize ${
              filter === filterOption
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filterOption}
            {filterOption === 'all' && ` (${applications.length})`}
            {filterOption !== 'all' && 
              ` (${applications.filter(app => app.status.toLowerCase() === filterOption).length})`
            }
          </button>
        ))}
      </div>

      {filteredApplications.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No applications found
          </h3>
          <p className="text-gray-600 mb-4">
            {filter === 'all' 
              ? "You haven't applied to any casting calls yet."
              : `No ${filter} applications found.`
            }
          </p>
          <Link
            href="/opportunities"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Browse available opportunities →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((application) => (
            <div
              key={application.id}
              className="bg-white border border-gray-200 rounded-lg shadow-sm p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {application.CastingCall.title}
                  </h3>
                  <p className="text-gray-600 mb-2">
                    {application.CastingCall.description}
                  </p>
                  {application.CastingCall.Studio && (
                    <p className="text-sm text-gray-500">
                      Studio: {application.CastingCall.Studio.name}
                    </p>
                  )}
                  {application.CastingCall.Project && (
                    <p className="text-sm text-gray-500">
                      Project: {application.CastingCall.Project.title}
                    </p>
                  )}
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                    application.status
                  )}`}
                >
                  {application.status}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm text-gray-500">
                <div className="flex space-x-4">
                  <span>Applied: {formatDate(application.createdAt)}</span>
                  {application.updatedAt !== application.createdAt && (
                    <span>Updated: {formatDate(application.updatedAt)}</span>
                  )}
                </div>
                
                {application.CastingCall.compensation && (
                  <span className="text-green-600 font-medium">
                    {application.CastingCall.compensation}
                  </span>
                )}
              </div>

              {application.message && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-700">
                    <strong>Message from studio:</strong> {application.message}
                  </p>
                </div>
              )}

              {application.CastingCall.startDate && (
                <div className="mt-4 text-sm text-gray-600">
                  <strong>Dates:</strong>{' '}
                  {formatDate(application.CastingCall.startDate)}
                  {application.CastingCall.endDate && 
                    ` - ${formatDate(application.CastingCall.endDate)}`
                  }
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}