'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import InitStudio from '../../init-studio';

type Location = {
  id: string;
  name: string;
};

type Project = {
  id: string;
  title: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  studioId: string;
  createdAt: string;
  updatedAt: string;
};

export default function ProjectDetailsPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const projectId = params.id;
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedTalent, setSelectedTalent] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [studioInitNeeded, setStudioInitNeeded] = useState(false);
  
  // Form state for project details
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'PLANNING',
    locationId: '',
    budget: '',
    talentNeeded: '',
    productionCompany: '',
    director: '',
    producer: '',
    castingDirector: '',
    genre: '',
    contentRating: '',
    notes: '',
  });
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/sign-in');
    } else if (status === 'authenticated') {
      if (projectId === 'new') {
        setIsEditing(true);
        setLoading(false);
      } else {
        fetchProjectDetails();
      }
      fetchLocations();
    }
  }, [status, projectId, router]);
  
  // Populate form when project data is loaded
  useEffect(() => {
    if (project) {
      setFormData({
        title: project.title || '',
        description: project.description || '',
        startDate: project.startDate 
          ? new Date(project.startDate).toISOString().split('T')[0] 
          : '',
        endDate: project.endDate 
          ? new Date(project.endDate).toISOString().split('T')[0] 
          : '',
        status: project.status || 'PLANNING',
        locationId: '', // This would be set if you have location data
        budget: '', // These fields would come from custom fields or metadata
        talentNeeded: '',
        productionCompany: '',
        director: '',
        producer: '',
        castingDirector: '',
        genre: '',
        contentRating: '',
        notes: '',
      });
    }
  }, [project]);
  
  const fetchProjectDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/studio/projects/${projectId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch project details');
      }
      
      const data = await response.json();
      setProject(data);
    } catch (error) {
      console.error('Error fetching project details:', error);
      setError('Failed to load project details. Please try again later.');
    } finally {
      setLoading(false);
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
      // For a new project, only send the absolutely required fields
      const payload = projectId === 'new' 
        ? { 
            title: formData.title 
          }
        : {
            title: formData.title,
            description: formData.description || null,
            startDate: formData.startDate || null,
            endDate: formData.endDate || null,
            status: formData.status,
          };
      
      console.log('Submitting project with payload:', payload);
      
      const method = projectId === 'new' ? 'POST' : 'PATCH';
      const url = projectId === 'new' 
        ? '/api/studio/projects' 
        : `/api/studio/projects/${projectId}`;
      
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
        
        // Check if this is a Studio not found error
        if (response.status === 404 && errorData.error === "Studio not found") {
          setStudioInitNeeded(true);
          throw new Error("Your studio account needs to be initialized");
        }
        
        throw new Error(errorData.error || 'Failed to save project');
      }
      
      const savedProject = await response.json();
      
      if (projectId === 'new') {
        // Redirect to the newly created project
        router.push(`/studio/projects/${savedProject.id}`);
      } else {
        setProject(savedProject);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error saving project:', error);
      setError('Failed to save project. Please try again.');
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
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching talent:', error);
    }
  };
  
  const handleInviteTalent = async () => {
    if (!selectedTalent || !inviteMessage.trim()) return;
    
    setInviteLoading(true);
    try {
      const response = await fetch('/api/studio/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: inviteMessage,
          subject: `Invitation to Project: ${project?.title || formData.title}`,
          talentReceiverId: selectedTalent,
          relatedToProjectId: projectId !== 'new' ? projectId : null,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send invitation');
      }
      
      setInviteSuccess('Invitation sent successfully!');
      setInviteMessage('');
      setSelectedTalent(null);
      setSearchQuery('');
      setSearchResults([]);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setInviteSuccess(null);
        setShowInviteModal(false);
      }, 3000);
    } catch (error) {
      console.error('Error sending invitation:', error);
      setError('Failed to send invitation. Please try again.');
    } finally {
      setInviteLoading(false);
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
        <div className="bg-red-50 border border-red-200 p-4 rounded-md text-red-600 mb-4">
          {error}
        </div>
        <button
          onClick={() => projectId !== 'new' ? fetchProjectDetails() : setError(null)}
          className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  // Show studio initialization dialog if needed
  if (studioInitNeeded) {
    return <InitStudio />;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {projectId === 'new' ? 'Create New Project' : project?.title || 'Project Details'}
        </h1>
        <div className="flex space-x-2">
          {!isEditing && projectId !== 'new' && (
            <>
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Invite Talent
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Edit Project
              </button>
            </>
          )}
          <Link
            href="/studio/projects"
            className="px-4 py-2 text-blue-600 bg-white border border-blue-600 rounded hover:bg-blue-50"
          >
            Back to Projects
          </Link>
        </div>
      </div>
      
      {/* Project Form / Details */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isEditing ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Information */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                    <option value="CASTING">Casting</option>
                    <option value="PRE_PRODUCTION">Pre-Production</option>
                    <option value="IN_PRODUCTION">In Production</option>
                    <option value="POST_PRODUCTION">Post-Production</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Genre
                  </label>
                  <input
                    type="text"
                    name="genre"
                    value={formData.genre}
                    onChange={handleChange}
                    placeholder="Drama, Comedy, Action, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Content Rating
                  </label>
                  <select
                    name="contentRating"
                    value={formData.contentRating}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a rating</option>
                    <option value="G">G (General Audiences)</option>
                    <option value="PG">PG (Parental Guidance)</option>
                    <option value="PG-13">PG-13 (Parents Strongly Cautioned)</option>
                    <option value="R">R (Restricted)</option>
                    <option value="NC-17">NC-17 (Adults Only)</option>
                    <option value="TV-Y">TV-Y (All Children)</option>
                    <option value="TV-G">TV-G (General Audience)</option>
                    <option value="TV-PG">TV-PG (Parental Guidance Suggested)</option>
                    <option value="TV-14">TV-14 (Parents Strongly Cautioned)</option>
                    <option value="TV-MA">TV-MA (Mature Audience)</option>
                  </select>
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
                    Budget
                  </label>
                  <input
                    type="text"
                    name="budget"
                    value={formData.budget}
                    onChange={handleChange}
                    placeholder="e.g. $50,000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
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
                    placeholder="Total number of talent needed"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Production Team */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Production Team</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Production Company
                  </label>
                  <input
                    type="text"
                    name="productionCompany"
                    value={formData.productionCompany}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Director
                  </label>
                  <input
                    type="text"
                    name="director"
                    value={formData.director}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Producer
                  </label>
                  <input
                    type="text"
                    name="producer"
                    value={formData.producer}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Casting Director
                  </label>
                  <input
                    type="text"
                    name="castingDirector"
                    value={formData.castingDirector}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Provide a detailed description of the project..."
              ></textarea>
            </div>
            
            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Any additional notes for the project..."
              ></textarea>
            </div>
            
            {/* Buttons */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => projectId !== 'new' ? setIsEditing(false) : router.push('/studio/projects')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {projectId === 'new' ? 'Create Project' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6">
            {project && (
              <div className="space-y-6">
                {/* Project Header */}
                <div className="border-b pb-4">
                  <div className="flex justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">{project.title}</h2>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      project.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      project.status === 'IN_PRODUCTION' ? 'bg-blue-100 text-blue-800' :
                      project.status === 'PLANNING' ? 'bg-yellow-100 text-yellow-800' :
                      project.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {project.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    Created {new Date(project.createdAt).toLocaleDateString()}
                    {project.updatedAt !== project.createdAt && 
                      ` • Updated ${new Date(project.updatedAt).toLocaleDateString()}`}
                  </div>
                </div>
                
                {/* Project Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Project Details</h3>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <dt className="text-sm font-medium text-gray-500">Start Date</dt>
                      <dd className="text-sm text-gray-900">
                        {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Not set'}
                      </dd>
                      
                      <dt className="text-sm font-medium text-gray-500">End Date</dt>
                      <dd className="text-sm text-gray-900">
                        {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Not set'}
                      </dd>
                      
                      <dt className="text-sm font-medium text-gray-500">Genre</dt>
                      <dd className="text-sm text-gray-900">
                        {formData.genre || 'Not specified'}
                      </dd>
                      
                      <dt className="text-sm font-medium text-gray-500">Content Rating</dt>
                      <dd className="text-sm text-gray-900">
                        {formData.contentRating || 'Not specified'}
                      </dd>
                      
                      <dt className="text-sm font-medium text-gray-500">Budget</dt>
                      <dd className="text-sm text-gray-900">
                        {formData.budget || 'Not specified'}
                      </dd>
                      
                      <dt className="text-sm font-medium text-gray-500">Talent Needed</dt>
                      <dd className="text-sm text-gray-900">
                        {formData.talentNeeded || 'Not specified'}
                      </dd>
                    </dl>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Production Team</h3>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <dt className="text-sm font-medium text-gray-500">Production Company</dt>
                      <dd className="text-sm text-gray-900">
                        {formData.productionCompany || 'Not specified'}
                      </dd>
                      
                      <dt className="text-sm font-medium text-gray-500">Director</dt>
                      <dd className="text-sm text-gray-900">
                        {formData.director || 'Not specified'}
                      </dd>
                      
                      <dt className="text-sm font-medium text-gray-500">Producer</dt>
                      <dd className="text-sm text-gray-900">
                        {formData.producer || 'Not specified'}
                      </dd>
                      
                      <dt className="text-sm font-medium text-gray-500">Casting Director</dt>
                      <dd className="text-sm text-gray-900">
                        {formData.castingDirector || 'Not specified'}
                      </dd>
                    </dl>
                  </div>
                </div>
                
                {/* Description */}
                <div>
                  <h3 className="text-lg font-medium mb-2">Description</h3>
                  <div className="text-gray-700 whitespace-pre-line">
                    {project.description || 'No description provided.'}
                  </div>
                </div>
                
                {/* Additional Notes */}
                {formData.notes && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Additional Notes</h3>
                    <div className="text-gray-700 whitespace-pre-line">
                      {formData.notes}
                    </div>
                  </div>
                )}
                
                {/* Quick Actions */}
                <div className="border-t pt-4 mt-6">
                  <h3 className="text-lg font-medium mb-3">Quick Actions</h3>
                  <div className="flex flex-wrap gap-3">
                    <Link 
                      href={`/studio/projects/${project.id}/scenes`}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Manage Scenes
                    </Link>
                    <Link 
                      href={`/studio/projects/${project.id}/casting`}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Casting Calls
                    </Link>
                    <Link 
                      href={`/studio/projects/${project.id}/members`}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      View Cast & Crew
                    </Link>
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                    >
                      Invite Talent
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Invite Talent Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Invite Talent to Project</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            
            {inviteSuccess && (
              <div className="bg-green-50 border border-green-200 p-3 rounded-md text-green-600 mb-4">
                {inviteSuccess}
              </div>
            )}
            
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
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invitation Message
              </label>
              <textarea
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                rows={4}
                placeholder="Write a personalized message inviting the talent to your project..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              ></textarea>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteTalent}
                disabled={!selectedTalent || !inviteMessage.trim() || inviteLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300 flex items-center"
              >
                {inviteLoading ? (
                  <>
                    <span className="h-4 w-4 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></span>
                    Sending...
                  </>
                ) : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}