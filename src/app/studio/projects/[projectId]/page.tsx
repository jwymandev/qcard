'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Project = {
  id: string;
  title: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  members?: any[];
  castingCalls?: any[];
};

export default function ProjectDetailPage({ params }: { params: { projectId: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { projectId } = params;
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/sign-in');
    } else if (status === 'authenticated') {
      fetchProject();
    }
  }, [status, router, projectId]);
  
  const fetchProject = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/studio/projects/${projectId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        
        throw new Error(errorData.error || 'Failed to fetch project');
      }
      
      const data = await response.json();
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
      setError('Failed to load project. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 p-4 rounded-md text-red-600 mb-6">
          {error}
          <button
            onClick={fetchProject}
            className="ml-2 underline"
          >
            Try Again
          </button>
        </div>
        <Link
          href="/studio/projects"
          className="text-blue-600 hover:underline"
        >
          &larr; Back to Projects
        </Link>
      </div>
    );
  }
  
  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md text-yellow-700 mb-6">
          Project not found or still loading...
        </div>
        <Link
          href="/studio/projects"
          className="text-blue-600 hover:underline"
        >
          &larr; Back to Projects
        </Link>
      </div>
    );
  }
  
  // Format dates for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Map status to badge color
  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'IN_PRODUCTION': return 'bg-blue-100 text-blue-800';
      case 'PLANNING': return 'bg-yellow-100 text-yellow-800';
      case 'CASTING': return 'bg-purple-100 text-purple-800';
      case 'PRE_PRODUCTION': return 'bg-indigo-100 text-indigo-800';
      case 'POST_PRODUCTION': return 'bg-orange-100 text-orange-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/studio/projects"
        className="text-blue-600 hover:underline inline-block mb-6"
      >
        &larr; Back to Projects
      </Link>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(project.status)}`}>
              {project.status.replace('_', ' ')}
            </span>
          </div>
          
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Description</h2>
            <p className="text-gray-700">
              {project.description || 'No description provided.'}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Project Details</h2>
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-600">Start Date</div>
                  <div>{formatDate(project.startDate)}</div>
                  
                  <div className="text-gray-600">End Date</div>
                  <div>{formatDate(project.endDate)}</div>
                  
                  <div className="text-gray-600">Created</div>
                  <div>{formatDate(project.createdAt)}</div>
                  
                  <div className="text-gray-600">Last Updated</div>
                  <div>{formatDate(project.updatedAt)}</div>
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold mb-2">Project Actions</h2>
              <div className="space-y-2">
                <Link
                  href={`/studio/projects/${projectId}/edit`}
                  className="block w-full px-4 py-2 bg-blue-600 text-white rounded text-center hover:bg-blue-700"
                >
                  Edit Project
                </Link>
                <Link
                  href={`/studio/projects/${projectId}/casting`}
                  className="block w-full px-4 py-2 bg-purple-600 text-white rounded text-center hover:bg-purple-700"
                >
                  Manage Casting
                </Link>
                <Link
                  href={`/studio/projects/${projectId}/casting/new`}
                  className="block w-full px-4 py-2 bg-green-600 text-white rounded text-center hover:bg-green-700"
                >
                  Create Casting Call
                </Link>
                <Link
                  href={`/studio/talent-invitation?projectId=${projectId}`}
                  className="block w-full px-4 py-2 bg-indigo-600 text-white rounded text-center hover:bg-indigo-700"
                >
                  Invite Talent Directly
                </Link>
              </div>
            </div>
          </div>
          
          {/* Project Tabs - can be expanded later */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex border-b border-gray-200">
              <button className="px-4 py-2 border-b-2 border-blue-500 text-blue-600 font-medium">
                Overview
              </button>
              <button className="px-4 py-2 text-gray-500 font-medium">
                Team Members
              </button>
              <button className="px-4 py-2 text-gray-500 font-medium">
                Casting Calls
              </button>
            </div>
            
            <div className="py-6">
              <div className="text-center text-gray-500">
                Project details and team management features coming soon.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}