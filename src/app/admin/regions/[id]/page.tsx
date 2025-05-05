'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { isUserSuperAdmin } from '@/lib/client-admin-helpers';

interface Region {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface Location {
  id: string;
  name: string;
  regionId?: string;
}

interface RegionStats {
  locations: number;
  castingCalls: number;
  profiles: number;
}

export default function RegionEditPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const regionId = params.id as string;
  
  const [region, setRegion] = useState<Region | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [stats, setStats] = useState<RegionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);
  const [saveMessage, setSaveMessage] = useState('');
  
  const isSuperAdmin = isUserSuperAdmin(session);
  
  // Fetch region details
  useEffect(() => {
    fetchRegion();
    fetchLocations();
  }, [regionId]);
  
  const fetchRegion = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/regions/${regionId}?includeStats=true`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch region: ${response.status}`);
      }
      
      const data = await response.json();
      setRegion(data);
      
      // Extract stats if available
      if (data._count) {
        setStats({
          locations: data._count.locations || 0,
          castingCalls: data._count.castingCalls || 0,
          profiles: data._count.profiles || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching region:', error);
      setError('Failed to load region details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch locations: ${response.status}`);
      }
      
      const data = await response.json();
      setLocations(data);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };
  
  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (region) {
      setRegion({ ...region, [name]: value });
    }
  };
  
  // Save region
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!region) return;
    
    if (!region.name.trim()) {
      setError('Region name is required');
      return;
    }
    
    try {
      setSaving(true);
      setSaveStatus(null);
      
      const response = await fetch(`/api/regions/${regionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: region.name,
          description: region.description,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update region');
      }
      
      setSaveStatus('success');
      setSaveMessage('Region updated successfully');
      
      // Wait a bit to show success message
      setTimeout(() => {
        setSaveStatus(null);
      }, 3000);
    } catch (error) {
      console.error('Error updating region:', error);
      setSaveStatus('error');
      setSaveMessage('Failed to update region. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  // Handle location region assignment
  const handleAssignLocation = async (locationId: string) => {
    try {
      const response = await fetch(`/api/locations/${locationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          regionId: regionId,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign location');
      }
      
      // Refresh data
      fetchLocations();
      fetchRegion();
      
      // Show success message
      setSaveStatus('success');
      setSaveMessage('Location assigned successfully');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('Error assigning location:', error);
      setSaveStatus('error');
      setSaveMessage('Failed to assign location. Please try again.');
    }
  };
  
  // Handle location removal from region
  const handleRemoveLocation = async (locationId: string) => {
    try {
      const response = await fetch(`/api/locations/${locationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          regionId: null,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove location');
      }
      
      // Refresh data
      fetchLocations();
      fetchRegion();
      
      // Show success message
      setSaveStatus('success');
      setSaveMessage('Location removed from region');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('Error removing location:', error);
      setSaveStatus('error');
      setSaveMessage('Failed to remove location. Please try again.');
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!region) {
    return (
      <div>
        <div className="mb-6">
          <Link href="/admin/regions" className="text-blue-600 hover:text-blue-800">
            &larr; Back to Regions
          </Link>
        </div>
        
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Region not found. The requested region may have been deleted.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Filter locations by region
  const regionLocations = locations.filter(loc => loc.regionId === regionId);
  const unassignedLocations = locations.filter(loc => !loc.regionId);
  
  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/regions" className="text-blue-600 hover:text-blue-800">
          &larr; Back to Regions
        </Link>
      </div>
      
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Edit Region: {region.name}</h1>
        <p className="text-gray-600">
          Update region details and manage location assignments.
          {!isSuperAdmin && ' Super admin privileges required for modifications.'}
        </p>
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
      
      {/* Save status message */}
      {saveStatus && (
        <div className={`mb-6 rounded-md p-4 ${
          saveStatus === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {saveStatus === 'success' ? (
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${
                saveStatus === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {saveMessage}
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main region form */}
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Region Details</h2>
            <form onSubmit={handleSave}>
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Region Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={region.name}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  required
                  disabled={!isSuperAdmin}
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={region.description || ''}
                  onChange={handleChange}
                  rows={4}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  disabled={!isSuperAdmin}
                />
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="block text-sm font-medium text-gray-700">Region ID</p>
                    <p className="text-sm text-gray-500">{region.id}</p>
                  </div>
                  <div>
                    <p className="block text-sm font-medium text-gray-700">Created</p>
                    <p className="text-sm text-gray-500">
                      {new Date(region.createdAt).toLocaleDateString()} {new Date(region.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <div>
                    <p className="block text-sm font-medium text-gray-700">Last Updated</p>
                    <p className="text-sm text-gray-500">
                      {new Date(region.updatedAt).toLocaleDateString()} {new Date(region.updatedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
              
              {isSuperAdmin && (
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </form>
          </div>
          
          {/* Locations in this region */}
          <div className="bg-white p-6 rounded-lg shadow mt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Locations in this Region</h2>
            
            {regionLocations.length > 0 ? (
              <div className="space-y-2">
                {regionLocations.map(location => (
                  <div key={location.id} className="flex justify-between items-center p-2 border border-gray-200 rounded">
                    <span className="text-sm font-medium">{location.name}</span>
                    {isSuperAdmin && (
                      <button
                        onClick={() => handleRemoveLocation(location.id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No locations assigned to this region.</p>
            )}
            
            {isSuperAdmin && unassignedLocations.length > 0 && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-gray-700">Add Location to Region</h3>
                </div>
                <div className="space-y-2">
                  {unassignedLocations.map(location => (
                    <div key={location.id} className="flex justify-between items-center p-2 border border-gray-200 rounded bg-gray-50">
                      <span className="text-sm">{location.name}</span>
                      <button
                        onClick={() => handleAssignLocation(location.id)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Add to Region
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Region statistics */}
        <div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Region Statistics</h2>
            
            {stats ? (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-md">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium text-blue-700">Locations</h3>
                    <span className="text-lg font-semibold text-blue-800">{stats.locations}</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">Geographic locations in this region</p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-md">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium text-green-700">Casting Calls</h3>
                    <span className="text-lg font-semibold text-green-800">{stats.castingCalls}</span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">Active casting calls in this region</p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-md">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium text-purple-700">Talents</h3>
                    <span className="text-lg font-semibold text-purple-800">{stats.profiles}</span>
                  </div>
                  <p className="text-xs text-purple-600 mt-1">Talents available in this region</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Statistics not available</p>
            )}
          </div>
          
          {/* Quick actions */}
          <div className="bg-white p-6 rounded-lg shadow mt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
            
            <div className="space-y-3">
              <Link 
                href={`/admin/locations?regionId=${regionId}`}
                className="block w-full text-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Manage Locations
              </Link>
              
              <Link 
                href={`/admin/casting-calls?regionId=${regionId}`}
                className="block w-full text-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                View Casting Calls
              </Link>
              
              <Link 
                href={`/admin/talents?regionId=${regionId}`}
                className="block w-full text-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                View Talents
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}