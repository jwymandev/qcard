'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ExternalTalentUpload from '@/components/ExternalTalentUpload';
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
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
  };
}

export default function ExternalActorsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  
  const [externalActors, setExternalActors] = useState<ExternalActor[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  
  const [newActor, setNewActor] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    notes: '',
  });
  
  const [isAddingActor, setIsAddingActor] = useState(false);
  const [addActorError, setAddActorError] = useState<string | null>(null);
  
  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchExternalActors();
      fetchProjects();
    } else if (authStatus === 'unauthenticated') {
      router.push('/sign-in');
    }
  }, [authStatus]);
  
  const fetchExternalActors = async (projectId?: string, status?: string) => {
    try {
      setLoading(true);
      
      // Add a timestamp parameter to prevent caching
      const timestamp = new Date().getTime();
      
      let url = '/api/studio/external-actors';
      const params = new URLSearchParams();
      
      if (projectId && projectId !== 'all') {
        params.append('projectId', projectId);
      }
      
      if (status && status !== 'all') {
        params.append('status', status);
      }
      
      // Add timestamp to force fresh data
      params.append('_t', timestamp.toString());
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      console.log('Fetching external actors from URL:', url);
      const response = await fetch(url, {
        // Add cache control headers
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Fetched ${data.length} external actors`);
        setExternalActors(data);
      } else {
        const errorText = await response.text();
        console.error('Failed response:', response.status, errorText);
        setError('Failed to fetch external actors');
      }
    } catch (err) {
      console.error('Error fetching external actors:', err);
      setError('An error occurred while loading data');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/studio/projects');
      
      if (response.ok) {
        const data = await response.json();
        setProjects(data.filter((p: any) => !p.isArchived));
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    fetchExternalActors(selectedProject, value === 'all' ? undefined : value);
  };
  
  const handleProjectFilterChange = (projectId: string) => {
    setSelectedProject(projectId);
    fetchExternalActors(projectId === 'all' ? undefined : projectId, activeTab === 'all' ? undefined : activeTab);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewActor(prev => ({ ...prev, [name]: value }));
  };
  
  const handleAddActor = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newActor.email) {
      setAddActorError('Email is required');
      return;
    }
    
    try {
      setIsAddingActor(true);
      setAddActorError(null);
      
      const response = await fetch('/api/studio/external-actors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newActor),
      });
      
      if (response.ok) {
        // Reset form and refresh list
        setNewActor({
          email: '',
          firstName: '',
          lastName: '',
          phoneNumber: '',
          notes: '',
        });
        
        fetchExternalActors(
          selectedProject === 'all' ? undefined : selectedProject, 
          activeTab === 'all' ? undefined : activeTab
        );
      } else {
        const errorData = await response.json();
        setAddActorError(errorData.error || 'Failed to add external actor');
      }
    } catch (err) {
      console.error('Error adding external actor:', err);
      setAddActorError('An error occurred');
    } finally {
      setIsAddingActor(false);
    }
  };
  
  const handleDeleteActor = async (id: string) => {
    if (!confirm('Are you sure you want to delete this external actor?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/studio/external-actors?id=${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        fetchExternalActors(
          selectedProject === 'all' ? undefined : selectedProject, 
          activeTab === 'all' ? undefined : activeTab
        );
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete external actor');
      }
    } catch (err) {
      console.error('Error deleting external actor:', err);
      setError('An error occurred');
    }
  };
  
  // State for success message banner
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Auto-hide success message after 10 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 10000); // 10 seconds
      
      return () => clearTimeout(timer);
    }
  }, [successMessage]);
  
  const handleUploadComplete = (result: any) => {
    console.log('Upload completed with result:', result);
    
    // Show success message
    if (result.success > 0) {
      // Clear any previous errors
      setError(null);
      
      // Refresh the list of external actors
      fetchExternalActors(
        selectedProject === 'all' ? undefined : selectedProject, 
        activeTab === 'all' ? undefined : activeTab
      );
      
      // Set success message for banner
      const message = `Successfully imported ${result.success} actors.` + 
                     (result.duplicates > 0 ? ` Skipped ${result.duplicates} duplicates.` : '');
      
      // Show in-page banner instead of popup alert
      if (!result.errors || result.errors.length === 0) {
        setSuccessMessage(message);
      }
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
        <span className="ml-2">Loading external actors...</span>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">External Talent</h1>
        <Button onClick={() => router.push('/studio/dashboard')}>Back to Dashboard</Button>
      </div>
      
      {/* Error Banner */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Success Banner */}
      {successMessage && (
        <Alert variant="default" className="mb-6 bg-green-50 border-green-200">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{successMessage}</span>
            <button 
              onClick={() => setSuccessMessage(null)} 
              className="text-green-700 hover:text-green-900"
              aria-label="Dismiss"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Add Actor Form */}
        <Card>
          <CardHeader>
            <CardTitle>Add External Talent</CardTitle>
          </CardHeader>
          <CardContent>
            {addActorError && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{addActorError}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleAddActor} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={newActor.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={newActor.firstName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={newActor.lastName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={newActor.phoneNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={newActor.notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <Button type="submit" disabled={isAddingActor}>
                {isAddingActor ? 'Adding...' : 'Add External Talent'}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        {/* CSV Upload */}
        <ExternalTalentUpload onUploadComplete={handleUploadComplete} />
      </div>
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-4 sm:p-6 border-b">
          <h2 className="text-xl font-semibold">Manage External Talent</h2>
          
          <div className="mt-4 flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0 sm:space-x-4">
            <Tabs 
              defaultValue="all" 
              value={activeTab}
              onValueChange={handleTabChange}
              className="w-full sm:w-auto"
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="ACTIVE">Active</TabsTrigger>
                <TabsTrigger value="CONVERTED">Converted</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex items-center space-x-2">
              <label htmlFor="project-filter" className="text-sm font-medium text-gray-700">
                Project:
              </label>
              <select
                id="project-filter"
                value={selectedProject}
                onChange={(e) => handleProjectFilterChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {externalActors.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No external talent found. Add talent manually or upload a CSV file.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Projects
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Added
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {externalActors.map((actor) => (
                  <tr key={actor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {actor.firstName || actor.lastName 
                          ? `${actor.firstName || ''} ${actor.lastName || ''}`.trim() 
                          : 'Not specified'}
                      </div>
                      {actor.phoneNumber && (
                        <div className="text-xs text-gray-500">{actor.phoneNumber}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{actor.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${actor.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                          actor.status === 'CONVERTED' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'}`}
                      >
                        {actor.status === 'ACTIVE' ? 'Active' :
                         actor.status === 'CONVERTED' ? 'Converted' : actor.status}
                      </span>
                      {actor.convertedToTalentAt && (
                        <div className="text-xs text-gray-500 mt-1">
                          Converted on {formatDate(actor.convertedToTalentAt)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {actor.projects.length > 0 ? (
                        <div className="text-sm text-gray-900">
                          {actor.projects.length === 1 
                            ? actor.projects[0].project.title
                            : `${actor.projects.length} projects`}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">None</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(actor.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/studio/external-actors/${actor.id}`)}
                        >
                          View
                        </Button>
                        {actor.status !== 'CONVERTED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-300 text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteActor(actor.id)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}