'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Spinner, Badge, Button, Alert, AlertDescription, AlertTitle } from '@/components/ui';
import InitStudio from '../../../init-studio';

// Types
interface CastingCall {
  id: string;
  title: string;
  description: string;
  requirements: string | null;
  compensation: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  location: {
    id: string;
    name: string;
  } | null;
  skillsRequired: {
    id: string;
    name: string;
  }[];
  applications: {
    id: string;
    status: string;
    createdAt: string;
    Profile: {
      id: string;
      User: {
        firstName: string;
        lastName: string;
        email: string;
      }
    }
  }[];
}

interface Project {
  id: string;
  title: string;
}

export default function CastingCallsPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const projectId = params.id;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studioInitNeeded, setStudioInitNeeded] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [castingCalls, setCastingCalls] = useState<CastingCall[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/sign-in');
    } else if (status === 'authenticated') {
      fetchProject();
      fetchCastingCalls();
    }
  }, [status, projectId, router]);
  
  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/studio/projects/${projectId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          const errorData = await response.json();
          if (errorData.error === "Studio not found") {
            setStudioInitNeeded(true);
            throw new Error("Your studio account needs to be initialized");
          }
          throw new Error("Project not found");
        }
        throw new Error("Failed to fetch project details");
      }
      
      const data = await response.json();
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
      setError('Failed to load project details. Please try again later.');
    }
  };
  
  const fetchCastingCalls = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/studio/casting-calls');
      
      if (!response.ok) {
        throw new Error('Failed to fetch casting calls');
      }
      
      const data = await response.json();
      
      // Filter for this project
      const projectCastingCalls = data.filter((call: any) => call.project?.id === projectId);
      setCastingCalls(projectCastingCalls);
    } catch (error) {
      console.error('Error fetching casting calls:', error);
      setError('Failed to load casting calls. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const updateCastingCallStatus = async (callId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/studio/casting-calls/${callId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update casting call status');
      }
      
      // Update the local state
      setCastingCalls(prev => prev.map(call => 
        call.id === callId ? { ...call, status: newStatus } : call
      ));
    } catch (error) {
      console.error('Error updating casting call status:', error);
      setError('Failed to update casting call status. Please try again.');
    }
  };
  
  // Filter casting calls by status
  const filteredCastingCalls = statusFilter === 'ALL'
    ? castingCalls
    : castingCalls.filter(call => call.status === statusFilter);
  
  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner />
      </div>
    );
  }
  
  if (studioInitNeeded) {
    return <InitStudio />;
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Link href="/studio/projects" className="text-blue-600 hover:text-blue-800">
          Back to Projects
        </Link>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Casting Calls</h1>
          {project && (
            <p className="text-gray-600">
              For project: {project.title}
            </p>
          )}
        </div>
        <div className="flex space-x-3">
          <Link
            href={`/studio/projects/${projectId}/casting/new`}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create New Casting Call
          </Link>
          <Link
            href={`/studio/projects/${projectId}`}
            className="px-4 py-2 text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
          >
            Back to Project
          </Link>
        </div>
      </div>
      
      <div className="mb-6">
        <label htmlFor="status-filter" className="mr-2 text-sm font-medium">
          Filter by Status:
        </label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="ALL">All Casting Calls</option>
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
          <option value="FILLED">Filled</option>
        </select>
      </div>
      
      {filteredCastingCalls.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-600 mb-4">
            {castingCalls.length === 0
              ? "You don't have any casting calls for this project yet."
              : "No casting calls match the selected filter."}
          </p>
          {castingCalls.length === 0 && (
            <Link
              href={`/studio/projects/${projectId}/casting/new`}
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create Your First Casting Call
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredCastingCalls.map((call) => (
            <div key={call.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{call.title}</h2>
                    <div className="flex flex-wrap gap-2 text-sm text-gray-600 mt-1">
                      {call.location && <div>{call.location.name}</div>}
                      <div>
                        {call.startDate && (
                          <>
                            {new Date(call.startDate).toLocaleDateString()}
                            {call.endDate && ` - ${new Date(call.endDate).toLocaleDateString()}`}
                          </>
                        )}
                      </div>
                      {call.compensation && <div className="text-green-600">{call.compensation}</div>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant={
                      call.status === 'OPEN' ? 'default' : 
                      call.status === 'FILLED' ? 'success' : 
                      'secondary'
                    }>
                      {call.status}
                    </Badge>
                    
                    <div className="relative group">
                      <Button variant="outline" size="sm">
                        {call.applications.length} 
                        {call.applications.length === 1 ? ' Application' : ' Applications'}
                      </Button>
                    </div>
                  </div>
                </div>
                
                <p className="mt-4 text-gray-700 line-clamp-2">{call.description}</p>
                
                {call.skillsRequired.length > 0 && (
                  <div className="mt-3">
                    <span className="text-sm text-gray-500 mr-2">Required skills:</span>
                    <div className="flex flex-wrap gap-1">
                      {call.skillsRequired.map(skill => (
                        <Badge key={skill.id} variant="secondary">{skill.name}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-6 flex flex-wrap gap-2">
                  <Link
                    href={`/studio/casting-calls/${call.id}`}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    View Details
                  </Link>
                  
                  <Link
                    href={`/studio/casting-calls/${call.id}/applications`}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    View Applications
                  </Link>
                  
                  {call.status === 'OPEN' && (
                    <button
                      onClick={() => updateCastingCallStatus(call.id, 'CLOSED')}
                      className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-100"
                    >
                      Close
                    </button>
                  )}
                  
                  {call.status === 'CLOSED' && (
                    <button
                      onClick={() => updateCastingCallStatus(call.id, 'OPEN')}
                      className="px-3 py-1 border border-green-600 text-green-700 text-sm rounded hover:bg-green-50"
                    >
                      Reopen
                    </button>
                  )}
                  
                  {call.status !== 'FILLED' && (
                    <button
                      onClick={() => updateCastingCallStatus(call.id, 'FILLED')}
                      className="px-3 py-1 border border-blue-300 text-blue-700 text-sm rounded hover:bg-blue-50"
                    >
                      Mark as Filled
                    </button>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  Created {new Date(call.createdAt).toLocaleDateString()}
                  {call.createdAt !== call.updatedAt && 
                    ` • Updated ${new Date(call.updatedAt).toLocaleDateString()}`}
                </span>
                
                <div className="text-sm">
                  <span className="text-green-600 font-medium mr-1">
                    {call.applications.filter(app => app.status === 'APPROVED').length}
                  </span>
                  approved,
                  <span className="text-yellow-600 font-medium mx-1">
                    {call.applications.filter(app => app.status === 'PENDING').length}
                  </span>
                  pending,
                  <span className="text-red-600 font-medium ml-1">
                    {call.applications.filter(app => app.status === 'REJECTED').length}
                  </span>
                  rejected
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}