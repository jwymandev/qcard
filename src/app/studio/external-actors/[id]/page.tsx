'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Button, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Alert, 
  AlertTitle, 
  AlertDescription,
  Spinner,
  Separator
} from '@/components/ui';

interface ExternalActor {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  notes?: string;
  status: string;
  convertedToTalentAt?: string;
  createdAt: string;
  updatedAt: string;
  projects: ExternalActorProject[];
  convertedProfile?: {
    id: string;
    userId: string;
    User?: {
      email: string;
      firstName?: string;
      lastName?: string;
    };
  };
}

interface ExternalActorProject {
  id: string;
  projectId: string;
  externalActorId: string;
  role?: string;
  notes?: string;
  project: {
    id: string;
    title: string;
    status: string;
    description?: string;
  };
}

interface Project {
  id: string;
  title: string;
  status: string;
}

export default function ExternalActorDetailsPage({ params }: { params: { id: string } }) {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const actorId = params.id;
  
  const [actor, setActor] = useState<ExternalActor | null>(null);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [projectRole, setProjectRole] = useState<string>('');
  const [projectNotes, setProjectNotes] = useState<string>('');
  const [isAddingToProject, setIsAddingToProject] = useState(false);
  
  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchActorDetails();
      fetchAvailableProjects();
    } else if (authStatus === 'unauthenticated') {
      router.push('/sign-in');
    }
  }, [authStatus, actorId]);
  
  const fetchActorDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/studio/external-actors?id=${actorId}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          setActor(data[0]);
        } else {
          setError('External actor not found');
        }
      } else {
        setError('Failed to fetch external actor details');
      }
    } catch (err) {
      console.error('Error fetching external actor details:', err);
      setError('An error occurred while loading data');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchAvailableProjects = async () => {
    try {
      const response = await fetch('/api/studio/projects');
      
      if (response.ok) {
        const data = await response.json();
        setAvailableProjects(data.filter((p: any) => !p.isArchived));
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };
  
  const handleAddToProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProject) {
      return;
    }
    
    try {
      setIsAddingToProject(true);
      
      const response = await fetch('/api/studio/external-actors/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          externalActorId: actorId,
          projectId: selectedProject,
          role: projectRole,
          notes: projectNotes,
        }),
      });
      
      if (response.ok) {
        // Reset form and refresh actor details
        setSelectedProject('');
        setProjectRole('');
        setProjectNotes('');
        await fetchActorDetails();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to add actor to project');
      }
    } catch (err) {
      console.error('Error adding actor to project:', err);
      setError('An error occurred');
    } finally {
      setIsAddingToProject(false);
    }
  };
  
  const handleRemoveFromProject = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to remove this actor from the project?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/studio/external-actors/projects?id=${assignmentId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await fetchActorDetails();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to remove actor from project');
      }
    } catch (err) {
      console.error('Error removing actor from project:', err);
      setError('An error occurred');
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
      <div className="flex justify-center items-center min-h-screen">
        <Spinner />
        <span className="ml-2">Loading actor details...</span>
      </div>
    );
  }
  
  if (!actor) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">External Actor Details</h1>
          <Button onClick={() => router.push('/studio/external-actors')}>Back to List</Button>
        </div>
        
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || 'External actor not found'}</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // Filter out projects that the actor is already assigned to
  const unassignedProjects = availableProjects.filter(
    project => !actor.projects.some(p => p.projectId === project.id)
  );
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">External Actor Details</h1>
        <Button onClick={() => router.push('/studio/external-actors')}>Back to List</Button>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>
                {actor.firstName || actor.lastName 
                  ? `${actor.firstName || ''} ${actor.lastName || ''}`.trim() 
                  : actor.email}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">Status</div>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${actor.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                      actor.status === 'CONVERTED' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'}`}
                  >
                    {actor.status === 'ACTIVE' ? 'Active' :
                     actor.status === 'CONVERTED' ? 'Converted' : actor.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Email</div>
                    <div className="font-medium">{actor.email}</div>
                  </div>
                  
                  {actor.phoneNumber && (
                    <div>
                      <div className="text-sm text-gray-500">Phone Number</div>
                      <div className="font-medium">{actor.phoneNumber}</div>
                    </div>
                  )}
                </div>
                
                {actor.convertedToTalentAt && actor.convertedProfile && (
                  <div className="bg-blue-50 p-4 rounded-md">
                    <div className="text-sm font-medium text-blue-800 mb-2">Converted to Talent User</div>
                    <div className="text-sm">
                      <p>This external actor has been converted to a talent user on {formatDate(actor.convertedToTalentAt)}.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => router.push(`/admin/talents/${actor.convertedProfile?.id}`)}
                      >
                        View Talent Profile
                      </Button>
                    </div>
                  </div>
                )}
                
                {actor.notes && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Notes</div>
                    <div className="text-sm bg-gray-50 p-3 rounded-md whitespace-pre-line">{actor.notes}</div>
                  </div>
                )}
                
                <div className="pt-2">
                  <div className="text-sm text-gray-500">Added on</div>
                  <div>{formatDate(actor.createdAt)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Projects */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Projects</CardTitle>
            </CardHeader>
            <CardContent>
              {actor.projects.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  This actor is not assigned to any projects yet.
                </div>
              ) : (
                <div className="space-y-6">
                  {actor.projects.map((project) => (
                    <div key={project.id} className="border rounded-md overflow-hidden">
                      <div className="bg-gray-50 p-4 flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">{project.project.title}</h3>
                          <span className={`mt-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${project.project.status === 'PLANNING' ? 'bg-blue-100 text-blue-800' :
                              project.project.status === 'IN_PROGRESS' ? 'bg-green-100 text-green-800' :
                              project.project.status === 'COMPLETED' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'}`}
                          >
                            {project.project.status}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/studio/projects/${project.projectId}`)}
                          >
                            View Project
                          </Button>
                          {actor.status !== 'CONVERTED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-300 text-red-700 hover:bg-red-50"
                              onClick={() => handleRemoveFromProject(project.id)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="p-4">
                        {project.role && (
                          <div className="mb-2">
                            <span className="text-sm font-medium text-gray-500">Role:</span>{' '}
                            <span>{project.role}</span>
                          </div>
                        )}
                        {project.notes && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">Notes:</span>
                            <p className="mt-1 text-sm bg-gray-50 p-2 rounded">{project.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Add to Project Form */}
        {actor.status !== 'CONVERTED' && (
          <Card>
            <CardHeader>
              <CardTitle>Add to Project</CardTitle>
            </CardHeader>
            <CardContent>
              {unassignedProjects.length === 0 ? (
                <Alert>
                  <AlertTitle>No Available Projects</AlertTitle>
                  <AlertDescription>
                    This actor is already assigned to all active projects or there are no active projects.
                  </AlertDescription>
                </Alert>
              ) : (
                <form onSubmit={handleAddToProject} className="space-y-4">
                  <div>
                    <label htmlFor="projectId" className="block text-sm font-medium text-gray-700 mb-1">
                      Project <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="projectId"
                      value={selectedProject}
                      onChange={(e) => setSelectedProject(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a project</option>
                      {unassignedProjects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <input
                      type="text"
                      id="role"
                      value={projectRole}
                      onChange={(e) => setProjectRole(e.target.value)}
                      placeholder="e.g. Lead Actor, Extra, Stunt Double"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      id="notes"
                      value={projectNotes}
                      onChange={(e) => setProjectNotes(e.target.value)}
                      rows={3}
                      placeholder="Any additional notes about this actor's involvement"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <Button type="submit" disabled={isAddingToProject || !selectedProject}>
                    {isAddingToProject ? 'Adding...' : 'Add to Project'}
                  </Button>
                </form>
              )}
              
              <Separator className="my-6" />
              
              <div className="text-sm text-gray-500">
                <p className="mb-2">When someone signs up with this email address, they will automatically be:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Converted from an external actor to a talent user</li>
                  <li>Added as a member to all projects they were assigned to</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}