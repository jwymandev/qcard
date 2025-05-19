'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui';

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

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const projectId = params.id;
  
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
      // Fetch project data
      const response = await fetch(`/api/studio/projects/${projectId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch project');
      }
      
      const data = await response.json();
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
      setError('Failed to load project data');
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
              <h3 className="text-md font-semibold mb-3">Project Timeline</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-600">Start Date</div>
                  <div>{formatDate(project.startDate)}</div>
                  <div className="text-gray-600">End Date</div>
                  <div>{formatDate(project.endDate)}</div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-md font-semibold mb-3">Project Status</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-600">Status</div>
                  <div>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(project.status)}`}>
                      {project.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-gray-600">Created</div>
                  <div>{formatDate(project.createdAt)}</div>
                  <div className="text-gray-600">Last Updated</div>
                  <div>{formatDate(project.updatedAt)}</div>
                </div>
              </div>
            </div>
          </div>
          
          <h3 className="text-md font-semibold mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/studio/projects/${projectId}/edit`}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200"
            >
              Edit Project
            </Link>
            <Link
              href={`/studio/projects/${projectId}/casting/new`}
              className="px-4 py-2 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200"
            >
              Create Casting Call
            </Link>
            <Link
              href={`/studio/talent-invitation?projectId=${projectId}`}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200"
            >
              Invite Talent
            </Link>
          </div>
          
          {project.castingCalls && project.castingCalls.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Casting Calls</h3>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {project.castingCalls.map((call: any) => (
                  <div key={call.id} className="border border-gray-200 rounded-md p-4 hover:shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">{call.title}</h4>
                      <Badge variant={call.status === 'OPEN' ? 'default' : 'outline'}>
                        {call.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{call.description}</p>
                    <div className="flex justify-end">
                      <Link
                        href={`/studio/casting-calls/${call.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {project.members && project.members.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Team Members</h3>
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Joined
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {project.members.map((member: any) => (
                      <tr key={member.id}>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {member.User?.firstName} {member.User?.lastName}
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{member.role || 'Member'}</div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(member.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}