'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Define Studio types
type Location = {
  id: string;
  name: string;
};

type Studio = {
  id: string;
  name: string;
  description: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  createdAt: string;
  updatedAt: string;
  locations: Location[];
};

export default function StudioProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [studio, setStudio] = useState<Studio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
  
  // Form state for editing
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    website: '',
    locationIds: [] as string[],
  });
  
  useEffect(() => {
    // Redirect if not authenticated
    if (status === 'unauthenticated') {
      router.push('/sign-in');
    } else if (status === 'authenticated') {
      fetchProfile();
      fetchLocations();
    }
  }, [status]);
  
  // Populate form data when studio is loaded
  useEffect(() => {
    if (studio) {
      setFormData({
        name: studio.name || '',
        description: studio.description || '',
        contactName: studio.contactName || '',
        contactEmail: studio.contactEmail || '',
        contactPhone: studio.contactPhone || '',
        website: studio.website || '',
        locationIds: studio.locations.map(location => location.id),
      });
    }
  }, [studio]);
  
  const fetchProfile = async () => {
    setLoading(true);
    try {
      console.log("Fetching studio profile data...");
      const response = await fetch('/api/studio/profile');
      
      if (!response.ok) {
        // Try to get response body regardless of status code
        const errorData = await response.json();
        
        // Handle studio initialization needed
        if (response.status === 404 && errorData?.error === "Studio profile not found, needs initialization") {
          await initializeStudio();
          return;
        }
        
        throw new Error(errorData?.error || `Failed to fetch profile: ${response.status}`);
      }
      
      const studioData = await response.json();
      setStudio(studioData);
      console.log("Studio profile loaded successfully");
    } catch (error) {
      console.error('Error fetching studio profile:', error);
      setError(`Failed to load profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const initializeStudio = async () => {
    try {
      console.log("Initializing studio profile...");
      const response = await fetch('/api/studio/init', {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || 'Failed to initialize studio');
      }
      
      await fetchProfile();
    } catch (error) {
      console.error('Error initializing studio profile:', error);
      setError(`Failed to initialize studio: ${error.message}`);
    }
  };
  
  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations');
      
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }
      
      const data = await response.json();
      setAvailableLocations(data);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  const handleLocationSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (selectedId && !formData.locationIds.includes(selectedId)) {
      setFormData({
        ...formData,
        locationIds: [...formData.locationIds, selectedId],
      });
    }
  };
  
  const handleLocationRemove = (locationId: string) => {
    setFormData({
      ...formData,
      locationIds: formData.locationIds.filter(id => id !== locationId),
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    
    try {
      console.log("Submitting studio profile update...");
      
      const response = await fetch('/api/studio/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || `Failed to update profile: ${response.status}`);
      }
      
      const updatedStudio = await response.json();
      setStudio(updatedStudio);
      setIsEditing(false);
      
      // Show success message
      setSuccessMessage('Studio profile updated successfully!');
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (error) {
      console.error('Error updating studio profile:', error);
      setError(`Failed to update profile: ${error.message}`);
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
        <div className="bg-red-50 border border-red-200 p-4 rounded-md text-red-600 mb-4">
          <h3 className="text-lg font-semibold mb-2">Error Loading Studio Profile</h3>
          <p>{error}</p>
        </div>
        <button
          onClick={() => fetchProfile()}
          className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Success message banner */}
      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                {successMessage}
              </p>
            </div>
            <div className="ml-auto pl-3">
              <button 
                onClick={() => setSuccessMessage(null)}
                className="inline-flex bg-green-50 rounded-md p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Studio Profile</h1>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`px-4 py-2 rounded-md ${
            isEditing
              ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isEditing ? 'Cancel Editing' : 'Edit Profile'}
        </button>
      </div>
      
      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Studio Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Studio Name*
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website || ''}
                    onChange={handleChange}
                    placeholder="https://www.yourstudio.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description || ''}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Tell talent about your studio..."
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    name="contactName"
                    value={formData.contactName || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    name="contactEmail"
                    value={formData.contactEmail || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    name="contactPhone"
                    value={formData.contactPhone || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Locations</h2>
              
              <select
                value=""
                onChange={handleLocationSelect}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 mb-3"
              >
                <option value="">Add a location...</option>
                {availableLocations.map(location => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
              
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.locationIds.map(locationId => {
                  const location = availableLocations.find(l => l.id === locationId);
                  return location ? (
                    <div
                      key={location.id}
                      className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center"
                    >
                      {location.name}
                      <button
                        type="button"
                        onClick={() => handleLocationRemove(location.id)}
                        className="ml-2 text-green-600 hover:text-green-800 focus:outline-none"
                      >
                        &times;
                      </button>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 flex items-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : 'Save Profile'}
            </button>
          </div>
        </form>
      ) : (
        studio && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{studio.name}</h2>
                
                {studio.description && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-500">About the Studio</h3>
                    <div className="mt-1 text-sm text-gray-900">{studio.description}</div>
                  </div>
                )}
                
                {studio.website && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-500">Website</h3>
                    <a 
                      href={studio.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="mt-1 text-sm text-blue-600 hover:underline"
                    >
                      {studio.website}
                    </a>
                  </div>
                )}
                
                {studio.locations.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-500">Locations</h3>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {studio.locations.map(location => (
                        <span
                          key={location.id}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                        >
                          {location.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {studio.contactName && (
                    <div>
                      <span className="text-gray-500 text-sm">Contact Person:</span>
                      <span className="ml-2">{studio.contactName}</span>
                    </div>
                  )}
                  
                  {studio.contactEmail && (
                    <div>
                      <span className="text-gray-500 text-sm">Email:</span>
                      <a href={`mailto:${studio.contactEmail}`} className="ml-2 text-blue-600 hover:underline">
                        {studio.contactEmail}
                      </a>
                    </div>
                  )}
                  
                  {studio.contactPhone && (
                    <div>
                      <span className="text-gray-500 text-sm">Phone:</span>
                      <a href={`tel:${studio.contactPhone}`} className="ml-2">
                        {studio.contactPhone}
                      </a>
                    </div>
                  )}
                </div>
                
                {!studio.contactName && !studio.contactEmail && !studio.contactPhone && (
                  <p className="text-gray-500">No contact information provided yet.</p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end">
              <Link 
                href="/studio/dashboard"
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 mr-2"
              >
                Back to Dashboard
              </Link>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Edit Profile
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}