'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Spinner, Badge, Button, Alert, AlertDescription, AlertTitle, Card } from '@/components/ui';
import InitStudio from '../init-studio';

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
    region?: {
      id: string;
      name: string;
    };
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
  project?: {
    id: string;
    title: string;
  } | null;
}

interface Project {
  id: string;
  title: string;
}

interface Location {
  id: string;
  name: string;
  region?: {
    id: string;
    name: string;
  };
}

export default function AllCastingCallsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studioInitNeeded, setStudioInitNeeded] = useState(false);
  const [castingCalls, setCastingCalls] = useState<CastingCall[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [projectFilter, setProjectFilter] = useState<string>('ALL');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('ALL');
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/sign-in');
    } else if (status === 'authenticated') {
      fetchCastingCalls();
      fetchProjects();
      fetchLocations();
    }
  }, [status, router]);
  
  const fetchCastingCalls = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/studio/casting-calls');
      
      if (!response.ok) {
        if (response.status === 404) {
          const errorData = await response.json();
          if (errorData.error === "Studio not found") {
            setStudioInitNeeded(true);
            throw new Error("Your studio account needs to be initialized");
          }
        }
        throw new Error('Failed to fetch casting calls');
      }
      
      const data = await response.json();
      setCastingCalls(data);
    } catch (error) {
      console.error('Error fetching casting calls:', error);
      setError('Failed to load casting calls. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/studio/projects');
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };
  
  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations');
      
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }
      
      const data = await response.json();
      setLocations(data);
    } catch (error) {
      console.error('Error fetching locations:', error);
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
  
  // Apply all filters to casting calls
  const filteredCastingCalls = castingCalls
    .filter(call => {
      // Status filter
      if (statusFilter !== 'ALL' && call.status !== statusFilter) {
        return false;
      }
      
      // Project filter
      if (projectFilter !== 'ALL' && call.project?.id !== projectFilter) {
        return false;
      }
      
      // Location filter
      if (locationFilter !== 'ALL' && call.location?.id !== locationFilter) {
        return false;
      }
      
      // Date filter
      if (dateFilter !== 'ALL') {
        const today = new Date();
        const startDate = call.startDate ? new Date(call.startDate) : null;
        const endDate = call.endDate ? new Date(call.endDate) : null;
        
        if (dateFilter === 'UPCOMING' && startDate && startDate > today) {
          return true;
        } else if (dateFilter === 'CURRENT' && startDate && endDate && startDate <= today && endDate >= today) {
          return true; 
        } else if (dateFilter === 'PAST' && endDate && endDate < today) {
          return true;
        } else if (dateFilter !== 'ALL') {
          return false;
        }
      }
      
      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          call.title.toLowerCase().includes(query) ||
          call.description.toLowerCase().includes(query) ||
          (call.requirements && call.requirements.toLowerCase().includes(query)) ||
          call.skillsRequired.some(skill => skill.name.toLowerCase().includes(query))
        );
      }
      
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
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
        <Link href="/studio/dashboard" className="text-blue-600 hover:text-blue-800">
          Back to Dashboard
        </Link>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">All Casting Calls</h1>
        <div className="flex space-x-3">
          <Link
            href="/studio/projects"
            className="px-4 py-2 text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
          >
            View Projects
          </Link>
        </div>
      </div>
      
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 text-center">
          <h3 className="text-sm text-gray-500">Total Casting Calls</h3>
          <p className="text-2xl font-bold">{castingCalls.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <h3 className="text-sm text-gray-500">Open Calls</h3>
          <p className="text-2xl font-bold text-green-600">
            {castingCalls.filter(call => call.status === 'OPEN').length}
          </p>
        </Card>
        <Card className="p-4 text-center">
          <h3 className="text-sm text-gray-500">Filled Calls</h3>
          <p className="text-2xl font-bold text-blue-600">
            {castingCalls.filter(call => call.status === 'FILLED').length}
          </p>
        </Card>
        <Card className="p-4 text-center">
          <h3 className="text-sm text-gray-500">Total Applications</h3>
          <p className="text-2xl font-bold text-purple-600">
            {castingCalls.reduce((total, call) => total + call.applications.length, 0)}
          </p>
        </Card>
      </div>
      
      {/* Search and filters */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-grow">
            <input
              type="text"
              placeholder="Search by title, description, skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <Button 
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
                setProjectFilter('ALL');
                setLocationFilter('ALL');
                setDateFilter('ALL');
              }}
              variant="outline"
            >
              Clear Filters
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
              <option value="FILLED">Filled</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="project-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Project
            </label>
            <select
              id="project-filter"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.title}</option>
              ))}
              <option value="NULL">No Project</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="location-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <select
              id="location-filter"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Locations</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Timeline
            </label>
            <select
              id="date-filter"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Dates</option>
              <option value="UPCOMING">Upcoming</option>
              <option value="CURRENT">Current</option>
              <option value="PAST">Past</option>
            </select>
          </div>
        </div>
      </div>
      
      {filteredCastingCalls.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-600 mb-4">
            {castingCalls.length === 0
              ? "You don't have any casting calls yet."
              : "No casting calls match the selected filters."}
          </p>
          {castingCalls.length === 0 && (
            <Link
              href="/studio/projects"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              View Projects to Create Casting Calls
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredCastingCalls.map((call) => (
            <div key={call.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{call.title}</h2>
                    <div className="flex flex-wrap gap-2 text-sm text-gray-600 mt-1">
                      {call.project && (
                        <Link href={`/studio/projects/${call.project.id}`} className="text-blue-600 hover:underline">
                          {call.project.title}
                        </Link>
                      )}
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
                  <div className="flex flex-wrap items-center gap-3">
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
              
              <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
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