'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert, AlertTitle, AlertDescription, Spinner } from '@/components/ui';

type ProjectSummary = {
  id: string;
  title: string;
  status: string;
  studioName: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  invitationStatus?: string;
};

export default function TalentProjectsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  
  const [activeProjects, setActiveProjects] = useState<ProjectSummary[]>([]);
  const [invitations, setInvitations] = useState<ProjectSummary[]>([]);
  const [pastProjects, setPastProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchProjects();
    } else if (authStatus === 'unauthenticated') {
      router.push('/sign-in');
    }
  }, [authStatus]);
  
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/talent/projects');
      
      if (response.ok) {
        const data = await response.json();
        
        // Process member projects
        const active: ProjectSummary[] = [];
        const past: ProjectSummary[] = [];
        
        data.memberProjects.forEach((project: any) => {
          const memberInfo = project.members[0]; // Get the talent's member info
          
          const projectSummary: ProjectSummary = {
            id: project.id,
            title: project.title,
            status: project.status,
            studioName: project.studio.name,
            role: memberInfo?.role || 'Talent',
            startDate: project.startDate,
            endDate: project.endDate
          };
          
          if (project.status === 'COMPLETED' || project.status === 'CANCELLED') {
            past.push(projectSummary);
          } else {
            active.push(projectSummary);
          }
        });
        
        // Process invitation projects
        const invitationsList = data.invitedProjects.map((project: any) => {
          const invitation = project.invitations[0]; // Get the talent's invitation
          
          return {
            id: project.id,
            title: project.title,
            status: project.status,
            studioName: project.studio.name,
            role: invitation?.role || 'Talent',
            startDate: project.startDate,
            endDate: project.endDate,
            invitationStatus: invitation?.status || 'PENDING'
          };
        });
        
        setActiveProjects(active);
        setPastProjects(past);
        setInvitations(invitationsList);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load your projects.');
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load your projects.');
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PLANNING':
        return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS':
        return 'bg-green-100 text-green-800';
      case 'COMPLETED':
        return 'bg-purple-100 text-purple-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getInvitationBadgeClass = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'ACCEPTED':
        return 'bg-green-100 text-green-800';
      case 'DECLINED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  if (authStatus === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner />
        <span className="ml-2">Loading projects...</span>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Projects</h1>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Project Invitations */}
      {invitations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Project Invitations</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {invitations.map((project) => (
                <li key={`invitation-${project.id}`}>
                  <Link href={`/talent/projects/${project.id}`} className="block hover:bg-gray-50">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="ml-2">
                            <div className="flex items-center">
                              <p className="text-md font-medium text-blue-600 truncate">{project.title}</p>
                              <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getInvitationBadgeClass(project.invitationStatus || 'PENDING')}`}>
                                {project.invitationStatus}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">
                              From: {project.studioName} • Role: {project.role || 'Talent'}
                            </p>
                          </div>
                        </div>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            View Details
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            Status: {project.status}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <p>
                            {project.startDate && `${formatDate(project.startDate)} - ${formatDate(project.endDate)}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {/* Active Projects */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Active Projects</h2>
        {activeProjects.length > 0 ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {activeProjects.map((project) => (
                <li key={project.id}>
                  <Link href={`/talent/projects/${project.id}`} className="block hover:bg-gray-50">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="ml-2">
                            <div className="flex items-center">
                              <p className="text-md font-medium text-blue-600 truncate">{project.title}</p>
                              <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(project.status)}`}>
                                {project.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">
                              Studio: {project.studioName} • Role: {project.role || 'Talent'}
                            </p>
                          </div>
                        </div>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            View Details
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <p>
                            {project.startDate && `${formatDate(project.startDate)} - ${formatDate(project.endDate)}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center text-gray-500">
            You do not have any active projects.
          </div>
        )}
      </div>
      
      {/* Past Projects */}
      {pastProjects.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Past Projects</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {pastProjects.map((project) => (
                <li key={project.id}>
                  <Link href={`/talent/projects/${project.id}`} className="block hover:bg-gray-50">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="ml-2">
                            <div className="flex items-center">
                              <p className="text-md font-medium text-blue-600 truncate">{project.title}</p>
                              <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(project.status)}`}>
                                {project.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">
                              Studio: {project.studioName} • Role: {project.role || 'Talent'}
                            </p>
                          </div>
                        </div>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            View Details
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <p>
                            {project.startDate && `${formatDate(project.startDate)} - ${formatDate(project.endDate)}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}