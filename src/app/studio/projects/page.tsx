'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import InitStudio from '../init-studio';

type Project = {
  id: string;
  title: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export default function ProjectsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [studioInitNeeded, setStudioInitNeeded] = useState(false);
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/sign-in');
    } else if (status === 'authenticated') {
      fetchProjects();
    }
  }, [status, router]);
  
  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/studio/projects');
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        
        // Check if this is a Studio not found error
        if (response.status === 404 && errorData.error === "Studio not found") {
          setStudioInitNeeded(true);
          throw new Error("Your studio account needs to be initialized");
        }
        
        throw new Error('Failed to fetch projects');
      }
      
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError('Failed to load projects. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Filter projects by status
  const filteredProjects = statusFilter === 'ALL'
    ? projects
    : projects.filter(project => project.status === statusFilter);
  
  // Show studio initialization dialog if needed
  if (studioInitNeeded) {
    return <InitStudio />;
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Your Projects</h1>
        <Link
          href="/studio/projects/new"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create New Project
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-md text-red-600 mb-6">
          {error}
          <button
            onClick={fetchProjects}
            className="ml-2 underline"
          >
            Try Again
          </button>
        </div>
      )}
      
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
          <option value="ALL">All Projects</option>
          <option value="PLANNING">Planning</option>
          <option value="CASTING">Casting</option>
          <option value="PRE_PRODUCTION">Pre-Production</option>
          <option value="IN_PRODUCTION">In Production</option>
          <option value="POST_PRODUCTION">Post-Production</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>
      
      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-600 mb-4">
            {projects.length === 0
              ? "You don't have any projects yet."
              : "No projects match the selected filter."}
          </p>
          {projects.length === 0 && (
            <Link
              href="/studio/projects/new"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create Your First Project
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Link
              key={project.id}
              href={`/studio/projects/${project.id}`}
              className="block"
            >
              <div className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-xl font-bold text-gray-900 truncate">{project.title}</h2>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      project.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      project.status === 'IN_PRODUCTION' ? 'bg-blue-100 text-blue-800' :
                      project.status === 'PLANNING' ? 'bg-yellow-100 text-yellow-800' :
                      project.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {project.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 line-clamp-2 mb-4">
                    {project.description || 'No description provided.'}
                  </p>
                  
                  <div className="text-sm text-gray-500">
                    <div className="flex justify-between mb-1">
                      <span>Start:</span>
                      <span>{project.startDate 
                        ? new Date(project.startDate).toLocaleDateString() 
                        : 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>End:</span>
                      <span>{project.endDate 
                        ? new Date(project.endDate).toLocaleDateString() 
                        : 'Not set'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-4 py-3 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    Created {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                  <span className="text-blue-600 text-sm font-medium">View Details →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}