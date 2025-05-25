'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { isUserSuperAdmin } from '@/lib/client-admin-helpers';

interface Location {
  id: string;
  name: string;
  regionId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Region {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    locations: number;
    castingCalls: number;
    profiles: number;
    studios: number;
  };
}

export default function RegionDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [region, setRegion] = useState<Region | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedRegion, setEditedRegion] = useState<{ name: string; description: string }>({ name: '', description: '' });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newLocation, setNewLocation] = useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const isSuperAdmin = isUserSuperAdmin(session);
  const regionId = params.id;
  
  // Fetch region and locations
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch region details with stats
        const regionResponse = await fetch(`/api/regions/${regionId}`, {
          credentials: 'include' // Make sure credentials are included for auth
        });
        
        if (!regionResponse.ok) {
          if (regionResponse.status === 404) {
            throw new Error('Region not found');
          }
          throw new Error(`Failed to fetch region: ${regionResponse.status}`);
        }
        
        const regionData = await regionResponse.json();
        setRegion(regionData);
        setEditedRegion({
          name: regionData.name,
          description: regionData.description || '',
        });
        
        // Fetch locations associated with this region
        const locationsResponse = await fetch(`/api/locations?regionId=${regionId}`, {
          credentials: 'include' // Make sure credentials are included for auth
        });
        
        if (!locationsResponse.ok) {
          throw new Error(`Failed to fetch locations: ${locationsResponse.status}`);
        }
        
        const locationsData = await locationsResponse.json();
        setLocations(locationsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load region data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [regionId]);
  
  // Update region
  const handleSaveRegion = async () => {
    if (!editedRegion.name.trim()) {
      setError('Region name is required');
      return;
    }
    
    try {
      setSaveStatus('saving');
      
      const response = await fetch(`/api/regions/${regionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedRegion),
        credentials: 'include' // Make sure credentials are included for auth
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update region');
      }
      
      const updatedRegion = await response.json();
      setRegion(prevRegion => ({ ...prevRegion, ...updatedRegion }));
      setIsEditing(false);
      setSaveStatus('success');
      
      // Reset status after a delay
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('Error updating region:', error);
      setError('Failed to update region. Please try again.');
      setSaveStatus('error');
    }
  };
  
  // Add new location
  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newLocation.trim()) {
      setError('Location name is required');
      return;
    }
    
    try {
      setSaveStatus('saving');
      
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newLocation,
          regionId: regionId,
        }),
        credentials: 'include' // Make sure credentials are included for auth
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create location');
      }
      
      const createdLocation = await response.json();
      setLocations(prev => [...prev, createdLocation]);
      setNewLocation('');
      setIsAddingLocation(false);
      setSaveStatus('success');
      
      // Update region counts
      if (region && region._count) {
        setRegion({
          ...region,
          _count: {
            ...region._count,
            locations: region._count.locations + 1,
          },
        });
      }
      
      // Reset status after a delay
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('Error creating location:', error);
      setError('Failed to create location. Please try again.');
      setSaveStatus('error');
    }
  };
  
  // Delete region
  const handleDeleteRegion = async () => {
    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/regions/${regionId}`, {
        method: 'DELETE',
        credentials: 'include' // Make sure credentials are included for auth
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle the case where the region has dependencies
        if (response.status === 400 && errorData.dependencies) {
          setError(`Cannot delete region with existing dependencies: ${JSON.stringify(errorData.dependencies)}`);
          setIsDeleting(false);
          setDeleteConfirm(false);
          return;
        }
        
        throw new Error(errorData.error || 'Failed to delete region');
      }
      
      // Redirect to regions list after successful deletion
      router.push('/admin/regions');
    } catch (error) {
      console.error('Error deleting region:', error);
      setError('Failed to delete region. Please try again.');
      setIsDeleting(false);
      setDeleteConfirm(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };
  
  if (loading) {
    return (
      <div className="p-6 text-center">
        <svg className="animate-spin h-8 w-8 mx-auto text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="mt-2 text-gray-500">Loading region data...</p>
      </div>
    );
  }
  
  if (error && !region) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
        <Link href="/admin/regions" className="text-blue-600 hover:text-blue-800">
          &larr; Back to Regions
        </Link>
      </div>
    );
  }
  
  if (!region) {
    return <div className="p-6 text-center">Region not found</div>;
  }
  
  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link href="/admin/dashboard" className="text-gray-700 hover:text-blue-600">
                Dashboard
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="w-3 h-3 text-gray-400 mx-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                </svg>
                <Link href="/admin/regions" className="text-gray-700 hover:text-blue-600">
                  Regions
                </Link>
              </div>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <svg className="w-3 h-3 text-gray-400 mx-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                </svg>
                <span className="text-gray-500">{region.name}</span>
              </div>
            </li>
          </ol>
        </nav>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={() => setError(null)}
                  className="inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Success message */}
      {saveStatus === 'success' && (
        <div className="mb-6 rounded-md bg-green-50 p-4 border border-green-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">Changes saved successfully!</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Region details card */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">Region Details</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Details and properties of the region.</p>
          </div>
          {isSuperAdmin && !isEditing && (
            <div className="flex space-x-2">
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Edit Region
              </button>
              <button
                onClick={() => setDeleteConfirm(true)}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-red-600 bg-white hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          )}
        </div>
        <div className="border-t border-gray-200">
          {isEditing ? (
            // Edit form
            <div className="px-4 py-5 sm:p-6">
              <form onSubmit={(e) => { e.preventDefault(); handleSaveRegion(); }}>
                <div className="mb-4">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Region Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={editedRegion.name}
                    onChange={(e) => setEditedRegion({ ...editedRegion, name: e.target.value })}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    required
                  />
                </div>
                
                <div className="mb-6">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={editedRegion.description}
                    onChange={(e) => setEditedRegion({ ...editedRegion, description: e.target.value })}
                    rows={3}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditedRegion({ name: region.name, description: region.description || '' });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveStatus === 'saving'}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            // Read-only view
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Region Name</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{region.name}</dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {region.description || <span className="text-gray-400 italic">No description provided</span>}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Statistics</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {region._count?.locations || 0} Locations
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {region._count?.castingCalls || 0} Casting Calls
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {region._count?.profiles || 0} Talent Profiles
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      {region._count?.studios || 0} Studios
                    </span>
                  </div>
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{formatDate(region.createdAt)}</dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{formatDate(region.updatedAt)}</dd>
              </div>
            </dl>
          )}
        </div>
      </div>
      
      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Deletion</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to delete the region "{region.name}"? This action cannot be undone.
            </p>
            <p className="text-sm text-gray-700 mb-6">
              <strong>Note:</strong> Regions with associated locations, casting calls, talent profiles, or studios cannot be deleted.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRegion}
                disabled={isDeleting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? 'Deleting...' : 'Delete Region'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Locations section */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">Locations</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Locations associated with this region.
            </p>
          </div>
          {isSuperAdmin && (
            <button
              onClick={() => setIsAddingLocation(true)}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Add Location
            </button>
          )}
        </div>
        
        {/* Add location form */}
        {isAddingLocation && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <form onSubmit={handleAddLocation} className="flex items-center">
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="Enter location name"
                className="flex-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                required
              />
              <div className="ml-3 flex-shrink-0 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingLocation(false);
                    setNewLocation('');
                  }}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveStatus === 'saving'}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  {saveStatus === 'saving' ? 'Adding...' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* Locations list */}
        <div className="border-t border-gray-200">
          {locations.length === 0 ? (
            <div className="px-4 py-5 text-center text-gray-500">
              No locations found for this region.
              {isSuperAdmin && !isAddingLocation && (
                <div className="mt-2">
                  <button
                    onClick={() => setIsAddingLocation(true)}
                    className="inline-flex items-center px-2.5 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
                  >
                    + Add your first location
                  </button>
                </div>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {locations.map((location) => (
                <li key={location.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{location.name}</p>
                      <p className="text-xs text-gray-500">Created: {formatDate(location.createdAt)}</p>
                    </div>
                    <a 
                      href={`#/admin/locations/${location.id}`} 
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Manage
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}