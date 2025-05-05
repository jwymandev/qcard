'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ProjectInvitationBanner from '@/components/ProjectInvitationBanner';
import { Button, Alert, AlertTitle, AlertDescription, Spinner } from '@/components/ui';
import Link from 'next/link';

type ProjectInvitation = {
  id: string;
  projectId: string;
  profileId: string;
  status: string;
  message?: string;
  role?: string;
  sentAt: string;
  respondedAt?: string;
  project: {
    id: string;
    title: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    status: string;
    Studio: {
      id: string;
      name: string;
      description?: string;
    };
  };
};

type Project = {
  id: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status: string;
  Studio: {
    id: string;
    name: string;
    description?: string;
  };
  scenes?: {
    id: string;
    title: string;
    shootDate?: string;
    status?: string;
    description?: string;
    SceneTalent?: {
      id: string;
      role?: string;
      notes?: string;
    }[];
  }[];
  projectMembers?: {
    id: string;
    role?: string;
    notes?: string;
  }[];
};

export default function TalentProjectDetailPage({ params }: { params: { id: string } }) {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const projectId = params.id;
  
  const [project, setProject] = useState<Project | null>(null);
  const [invitation, setInvitation] = useState<ProjectInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchProjectDetails();
    } else if (authStatus === 'unauthenticated') {
      router.push('/sign-in');
    }
  }, [authStatus, projectId]);
  
  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/talent/projects/${projectId}`);
      
      if (response.ok) {
        const data = await response.json();
        setProject(data.project);
        setInvitation(data.invitation);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load project details.');
      }
    } catch (err) {
      console.error('Error fetching project details:', err);
      setError('An error occurred while loading project data.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAcceptInvitation = async () => {
    if (!invitation) return;
    
    try {
      const response = await fetch(`/api/talent/projects/invitations/${invitation.id}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        // Refresh all project details after acceptance
        await fetchProjectDetails();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to accept invitation.');
      }
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError('An error occurred while accepting the invitation.');
    }
  };
  
  const handleDeclineInvitation = async () => {
    if (!invitation) return;
    
    try {
      const response = await fetch(`/api/talent/projects/invitations/${invitation.id}/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        // Refresh all project details after declining
        await fetchProjectDetails();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to decline invitation.');
      }
    } catch (err) {
      console.error('Error declining invitation:', err);
      setError('An error occurred while declining the invitation.');
    }
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  if (authStatus === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner />
        <span className="ml-2">Loading project...</span>
      </div>
    );
  }
  
  // If we have an invitation but no project data, show invitation details
  if (!project && invitation) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/talent/projects" className="text-blue-600 hover:text-blue-800">
            ← Back to Projects
          </Link>
        </div>
        
        <ProjectInvitationBanner 
          invitation={invitation} 
          onAccept={handleAcceptInvitation}
          onDecline={handleDeclineInvitation}
        />
        
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{invitation.project.title}</h1>
            <p className="text-sm text-gray-500 mb-4">From {invitation.project.Studio.name}</p>
            
            {invitation.project.description && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">Description</h2>
                <p className="text-gray-700">{invitation.project.description}</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h2 className="text-lg font-semibold mb-2">Project Details</h2>
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="mb-2">
                    <span className="font-medium">Status:</span>{' '}
                    <span className="capitalize">{invitation.project.status.toLowerCase()}</span>
                  </div>
                  <div className="mb-2">
                    <span className="font-medium">Start Date:</span>{' '}
                    <span>{formatDate(invitation.project.startDate)}</span>
                  </div>
                  <div>
                    <span className="font-medium">End Date:</span>{' '}
                    <span>{formatDate(invitation.project.endDate)}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h2 className="text-lg font-semibold mb-2">Invitation Details</h2>
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="mb-2">
                    <span className="font-medium">Role:</span>{' '}
                    <span>{invitation.role || 'Talent'}</span>
                  </div>
                  <div className="mb-2">
                    <span className="font-medium">Sent:</span>{' '}
                    <span>{formatDate(invitation.sentAt)}</span>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>{' '}
                    <span className="capitalize">{invitation.status.toLowerCase()}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {invitation.message && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">Message</h2>
                <div className="bg-blue-50 p-4 rounded-md">
                  <p className="text-gray-700">{invitation.message}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/talent/projects" className="text-blue-600 hover:text-blue-800">
            ← Back to Projects
          </Link>
        </div>
        
        <Alert>
          <AlertTitle>Project Not Found</AlertTitle>
          <AlertDescription>
            This project does not exist or you do not have access to view it.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/talent/projects" className="text-blue-600 hover:text-blue-800">
          ← Back to Projects
        </Link>
      </div>
      
      {/* Show invitation banner if there's an invitation */}
      {invitation && (
        <ProjectInvitationBanner 
          invitation={invitation} 
          onAccept={handleAcceptInvitation}
          onDecline={handleDeclineInvitation}
        />
      )}
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{project.title}</h1>
          <p className="text-sm text-gray-500 mb-4">By {project.Studio.name}</p>
          
          {project.description && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Description</h2>
              <p className="text-gray-700">{project.description}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Project Details</h2>
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="mb-2">
                  <span className="font-medium">Status:</span>{' '}
                  <span className="capitalize">{project.status.toLowerCase()}</span>
                </div>
                <div className="mb-2">
                  <span className="font-medium">Start Date:</span>{' '}
                  <span>{formatDate(project.startDate)}</span>
                </div>
                <div>
                  <span className="font-medium">End Date:</span>{' '}
                  <span>{formatDate(project.endDate)}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold mb-2">Your Role</h2>
              <div className="bg-blue-50 p-4 rounded-md">
                {project.projectMembers && project.projectMembers.length > 0 ? (
                  <>
                    <div className="mb-2">
                      <span className="font-medium">Role:</span>{' '}
                      <span>{project.projectMembers[0]?.role || 'Talent'}</span>
                    </div>
                    {project.projectMembers[0]?.notes && (
                      <div>
                        <span className="font-medium">Notes:</span>{' '}
                        <span>{project.projectMembers[0].notes}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-600 italic">
                    {invitation ? (
                      <>Your role will be: {invitation.role || 'Talent'}</>
                    ) : (
                      <>Role information not available</>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {project.scenes && project.scenes.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Scenes</h2>
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                {project.scenes.map((scene) => (
                  <div key={scene.id} className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-lg">{scene.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        scene.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        scene.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {scene.status}
                      </span>
                    </div>
                    
                    {scene.description && (
                      <p className="text-gray-700 mb-3">{scene.description}</p>
                    )}
                    
                    <div className="mb-2">
                      <span className="font-medium text-sm">Shoot Date:</span>{' '}
                      <span className="text-sm">{formatDate(scene.shootDate)}</span>
                    </div>
                    
                    {scene.SceneTalent && scene.SceneTalent.length > 0 ? (
                      <div className="mt-3 p-3 bg-blue-50 rounded-md">
                        <h4 className="font-medium text-sm mb-1">Your Role</h4>
                        <p>{scene.SceneTalent[0].role || 'Talent'}</p>
                        {scene.SceneTalent[0].notes && (
                          <p className="text-sm text-gray-600 mt-1">{scene.SceneTalent[0].notes}</p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-500 italic">You&apos;re not currently cast in this scene.</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}