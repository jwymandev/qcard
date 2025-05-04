'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import InitStudio from '../../../../init-studio';

type Location = {
  id: string;
  name: string;
};

type SceneTalent = {
  id: string;
  role: string | null;
  notes: string | null;
  status: string;
  profile: {
    id: string;
    user: {
      firstName: string | null;
      lastName: string | null;
      email: string;
    };
    images?: Array<{
      id: string;
      url: string;
      isPrimary: boolean;
    }>;
  };
};

type Scene = {
  id: string;
  title: string;
  description: string | null;
  shootDate: string | null;
  duration: number | null;
  locationId: string | null;
  location: Location | null;
  talentNeeded: number | null;
  status: string;
  projectId: string;
  talents: SceneTalent[];
  createdAt: string;
  updatedAt: string;
};

type Project = {
  id: string;
  title: string;
};

export default function SceneDetailPage({ 
  params 
}: { 
  params: { id: string; sceneId: string } 
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id: projectId, sceneId } = params;
  const isNewScene = sceneId === 'new';
  
  const [scene, setScene] = useState<Scene | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(isNewScene);
  const [locations, setLocations] = useState<Location[]>([]);
  const [studioInitNeeded, setStudioInitNeeded] = useState(false);
  const [showTalentModal, setShowTalentModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedTalent, setSelectedTalent] = useState<string | null>(null);
  const [talentRole, setTalentRole] = useState('');
  const [talentNotes, setTalentNotes] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  
  // Form state for scene details
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    shootDate: '',
    duration: '',
    locationId: '',
    talentNeeded: '',
    status: 'PLANNING',
  });
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/sign-in');
    } else if (status === 'authenticated') {
      fetchLocations();
      if (!isNewScene) {
        fetchSceneDetails();
      } else {
        setLoading(false);
      }
      fetchProject();
    }
  }, [status, projectId, sceneId, router, isNewScene]);
  
  // Populate form data when scene is loaded
  useEffect(() => {
    if (scene) {
      setFormData({
        title: scene.title || '',
        description: scene.description || '',
        shootDate: scene.shootDate 
          ? new Date(scene.shootDate).toISOString().split('T')[0] 
          : '',
        duration: scene.duration ? scene.duration.toString() : '',
        locationId: scene.locationId || '',
        talentNeeded: scene.talentNeeded ? scene.talentNeeded.toString() : '',
        status: scene.status || 'PLANNING',
      });
    }
  }, [scene]);
  
  const fetchSceneDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/studio/projects/${projectId}/scenes/${sceneId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        
        if (response.status === 404 && errorData.error === "Studio not found") {
          setStudioInitNeeded(true);
          throw new Error("Your studio account needs to be initialized");
        }
        
        throw new Error('Failed to fetch scene details');
      }
      
      const data = await response.json();
      setScene(data);
    } catch (error) {
      console.error('Error fetching scene details:', error);
      setError('Failed to load scene details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/studio/projects/${projectId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch project');
      }
      
      const data = await response.json();
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
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
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      // Prepare the data
      const payload = {
        title: formData.title,
        description: formData.description || null,
        shootDate: formData.shootDate || null,
        duration: formData.duration ? parseInt(formData.duration) : null,
        locationId: formData.locationId || null,
        talentNeeded: formData.talentNeeded ? parseInt(formData.talentNeeded) : null,
        status: formData.status,
      };
      
      console.log('Submitting scene with payload:', payload);
      
      const method = isNewScene ? 'POST' : 'PATCH';
      const url = isNewScene 
        ? `/api/studio/projects/${projectId}/scenes` 
        : `/api/studio/projects/${projectId}/scenes/${sceneId}`;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      // Log the raw response for debugging
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to save scene');
      }
      
      const savedScene = await response.json();
      
      if (isNewScene) {
        // Redirect to the newly created scene
        router.push(`/studio/projects/${projectId}/scenes/${savedScene.id}`);
      } else {
        setScene(savedScene);
        setIsEditing(false);
        // Refresh the scene details to get updated data
        fetchSceneDetails();
      }
    } catch (error) {
      console.error('Error saving scene:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage || 'An error occurred while saving the scene');
    }
  };
  
  const handleSearchTalent = async () => {
    if (searchQuery.length < 2) return;
    
    try {
      const response = await fetch(`/api/studio/talent/search?query=${encodeURIComponent(searchQuery)}`);
      
      if (!response.ok) {
        throw new Error('Failed to search talent');
      }
      
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Error searching talent:', error);
    }
  };
  
  const handleAssignTalent = async () => {
    if (!selectedTalent) return;
    
    setAssignLoading(true);
    try {
      const response = await fetch(`/api/studio/projects/${projectId}/scenes/${sceneId}/talents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profileId: selectedTalent,
          role: talentRole || null,
          notes: talentNotes || null,
          status: 'CONFIRMED',
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to assign talent to scene');
      }
      
      // Reset form and close modal
      setSelectedTalent(null);
      setTalentRole('');
      setTalentNotes('');
      setSearchQuery('');
      setSearchResults([]);
      setShowTalentModal(false);
      
      // Refresh scene data
      fetchSceneDetails();
    } catch (error) {
      console.error('Error assigning talent:', error);
      setError('Failed to assign talent. Please try again.');
    } finally {
      setAssignLoading(false);
    }
  };
  
  const handleRemoveTalent = async (talentId: string) => {
    if (!confirm('Are you sure you want to remove this talent from the scene?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/studio/projects/${projectId}/scenes/${sceneId}/talents/${talentId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove talent from scene');
      }
      
      // Refresh scene data
      fetchSceneDetails();
    } catch (error) {
      console.error('Error removing talent:', error);
      setError('Failed to remove talent. Please try again.');
    }
  };
  
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
  
  if (error && !isNewScene && !scene) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 p-4 rounded-md text-red-600 mb-4">
          {error}
        </div>
        <button
          onClick={() => fetchSceneDetails()}
          className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">
            {isNewScene ? 'Create New Scene' : scene?.title || 'Scene Details'}
          </h1>
          {project && (
            <p className="text-gray-600">Project: {project.title}</p>
          )}
        </div>
        <div className="flex space-x-2">
          {!isEditing && !isNewScene && (
            <button
              onClick={() => setShowTalentModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Add Talent
            </button>
          )}
          {!isEditing && !isNewScene && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Edit Scene
            </button>
          )}
          <Link
            href={`/studio/projects/${projectId}/scenes`}
            className="px-4 py-2 text-blue-600 bg-white border border-blue-600 rounded hover:bg-blue-50"
          >
            Back to Scenes
          </Link>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-md text-red-600 mb-6">
          {error}
        </div>
      )}
      
      {/* Scene Form / Details */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isEditing ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scene Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Beach Scene, Car Chase"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="PLANNING">Planning</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shoot Date
                </label>
                <input
                  type="date"
                  name="shootDate"
                  value={formData.shootDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. 120"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <select
                  name="locationId"
                  value={formData.locationId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select location</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Talent Needed
                </label>
                <input
                  type="number"
                  name="talentNeeded"
                  value={formData.talentNeeded}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Number of extras needed"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the scene, setting, and what happens..."
              ></textarea>
            </div>
            
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => isNewScene 
                  ? router.push(`/studio/projects/${projectId}/scenes`) 
                  : setIsEditing(false)
                }
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {isNewScene ? 'Create Scene' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          scene && (
            <div className="p-6">
              {/* Scene Header */}
              <div className="border-b pb-4 mb-6">
                <div className="flex justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">{scene.title}</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    scene.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                    scene.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                    scene.status === 'PLANNING' ? 'bg-yellow-100 text-yellow-800' :
                    scene.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {scene.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  Created {new Date(scene.createdAt).toLocaleDateString()}
                  {scene.updatedAt !== scene.createdAt && 
                    ` • Updated ${new Date(scene.updatedAt).toLocaleDateString()}`}
                </div>
              </div>
              
              {/* Scene Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Scene Details</h3>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <dt className="text-sm font-medium text-gray-500">Shoot Date</dt>
                    <dd className="text-sm text-gray-900">
                      {scene.shootDate ? new Date(scene.shootDate).toLocaleDateString() : 'Not set'}
                    </dd>
                    
                    <dt className="text-sm font-medium text-gray-500">Duration</dt>
                    <dd className="text-sm text-gray-900">
                      {scene.duration ? `${scene.duration} minutes` : 'Not specified'}
                    </dd>
                    
                    <dt className="text-sm font-medium text-gray-500">Location</dt>
                    <dd className="text-sm text-gray-900">
                      {scene.location?.name || 'Not specified'}
                    </dd>
                    
                    <dt className="text-sm font-medium text-gray-500">Talent Needed</dt>
                    <dd className="text-sm text-gray-900">
                      {scene.talentNeeded || 'Not specified'}
                    </dd>
                  </dl>
                </div>
                
                {scene.description && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Description</h3>
                    <div className="text-gray-700 whitespace-pre-line">
                      {scene.description}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Scene Talent */}
              <div className="border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">
                    Assigned Talent {scene.talents?.length > 0 ? `(${scene.talents.length})` : ''}
                  </h3>
                  <button
                    onClick={() => setShowTalentModal(true)}
                    className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
                  >
                    Add Talent
                  </button>
                </div>
                
                {scene.talents?.length === 0 ? (
                  <div className="bg-gray-50 p-4 rounded-md text-center text-gray-500">
                    No talent has been assigned to this scene yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {scene.talents.map(talent => (
                      <div key={talent.id} className="bg-white border rounded-lg p-4 flex">
                        <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                          {talent.profile.images && talent.profile.images[0] && (
                            <img 
                              src={talent.profile.images[0].url} 
                              alt={`${talent.profile.user.firstName} ${talent.profile.user.lastName}`}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="ml-3 flex-1">
                          <div className="font-medium">
                            {talent.profile.user.firstName} {talent.profile.user.lastName}
                          </div>
                          
                          {talent.role && (
                            <div className="text-sm text-gray-600 mt-1">
                              Role: {talent.role}
                            </div>
                          )}
                          
                          <div className="mt-2 flex justify-between items-center">
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              talent.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                              talent.status === 'TENTATIVE' ? 'bg-yellow-100 text-yellow-800' :
                              talent.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {talent.status}
                            </span>
                            <button
                              onClick={() => handleRemoveTalent(talent.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>
      
      {/* Add Talent Modal */}
      {showTalentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Add Talent to Scene</h3>
              <button
                onClick={() => setShowTalentModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search for Talent
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, skills, or attributes"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={handleSearchTalent}
                  disabled={searchQuery.length < 2}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
                >
                  Search
                </button>
              </div>
            </div>
            
            {searchResults.length > 0 && (
              <div className="mb-4 max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                <div className="divide-y divide-gray-200">
                  {searchResults.map((talent: any) => (
                    <div 
                      key={talent.id}
                      className={`p-3 flex items-center hover:bg-gray-50 cursor-pointer ${
                        selectedTalent === talent.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedTalent(talent.id)}
                    >
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex-shrink-0 mr-3">
                        {talent.imageUrl && (
                          <img 
                            src={talent.imageUrl} 
                            alt={talent.name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{talent.name}</div>
                        <div className="text-sm text-gray-500">
                          {talent.skills?.map((skill: any) => skill.name).join(', ')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {selectedTalent && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role (optional)
                  </label>
                  <input
                    type="text"
                    value={talentRole}
                    onChange={(e) => setTalentRole(e.target.value)}
                    placeholder="e.g. Pedestrian, Cafe Customer"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    value={talentNotes}
                    onChange={(e) => setTalentNotes(e.target.value)}
                    rows={2}
                    placeholder="Any specific instructions or requirements for this talent"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  ></textarea>
                </div>
              </>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowTalentModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignTalent}
                disabled={!selectedTalent || assignLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300 flex items-center"
              >
                {assignLoading ? (
                  <>
                    <span className="h-4 w-4 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></span>
                    Assigning...
                  </>
                ) : 'Add to Scene'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}