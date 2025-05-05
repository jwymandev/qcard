'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchLocations, fetchRegions, createLocation, assignLocationToRegion } from '@/lib/region-helpers';
import { useIsSuperAdmin } from '@/lib/client-admin-helpers';
import RegionLocationSelector from '@/components/admin/RegionLocationSelector';

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [newLocation, setNewLocation] = useState({ name: '' });
  const [regions, setRegions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<string | 'all'>('all');
  
  const router = useRouter();
  const isSuperAdmin = useIsSuperAdmin();
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch locations with region information
        const locationsData = await fetchLocations(true);
        setLocations(locationsData);
        
        // Fetch regions for filtering and assignment
        const regionsData = await fetchRegions();
        setRegions(regionsData);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load locations. Please try refreshing the page.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Filter locations by selected region
  const filteredLocations = selectedRegionFilter === 'all'
    ? locations
    : selectedRegionFilter === 'unassigned'
    ? locations.filter(location => !location.regionId)
    : locations.filter(location => location.regionId === selectedRegionFilter);
  
  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newLocation.name.trim()) {
      setCreateError('Location name is required');
      return;
    }
    
    try {
      const createdLocation = await createLocation({ 
        name: newLocation.name.trim()
      });
      
      // Update locations list
      setLocations([createdLocation, ...locations]);
      
      // Reset form
      setNewLocation({ name: '' });
      setCreateError(null);
    } catch (err) {
      console.error('Error creating location:', err);
      setCreateError('Failed to create location. Please try again.');
    }
  };
  
  const handleDeleteLocation = async (locationId: string) => {
    if (!isSuperAdmin) {
      setError('Only super admins can delete locations');
      return;
    }
    
    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/locations/${locationId}`, {
        method: 'DELETE',
      });
      
      if (response.status === 400) {
        // Location has dependencies
        const data = await response.json();
        setError(`Cannot delete location: it is used by ${data.dependencies._count.CastingCall} casting calls, ${data.dependencies._count.Scene} scenes, ${data.dependencies._count.Profile} profiles, and ${data.dependencies._count.Studio} studios.`);
        setDeleteConfirmId(null);
        setIsDeleting(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to delete location');
      }
      
      // Remove from locations list
      setLocations(locations.filter(loc => loc.id !== locationId));
      setDeleteConfirmId(null);
      setIsDeleting(false);
    } catch (err) {
      console.error('Error deleting location:', err);
      setError('Failed to delete location. Please try again.');
      setIsDeleting(false);
    }
  };
  
  const handleRegionUpdate = async (locationId: string, regionId: string | null) => {
    try {
      const updatedLocation = await assignLocationToRegion(locationId, regionId);
      
      // Update the locations list with the updated location
      setLocations(locations.map(loc => 
        loc.id === locationId ? updatedLocation : loc
      ));
      
      return Promise.resolve();
    } catch (err) {
      console.error('Error updating location region:', err);
      setError('Failed to update region assignment. Please try again.');
      return Promise.reject(err);
    }
  };
  
  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-6">Location Management</h1>
        <div>Loading...</div>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Location Management</h1>
        <Link href="/admin/regions" className="text-blue-600 hover:text-blue-800">
          Manage Regions
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button 
            className="float-right text-red-700" 
            onClick={() => setError(null)}
          >
            &times;
          </button>
        </div>
      )}
      
      {/* Create new location form */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <h2 className="text-lg font-medium mb-4">Create New Location</h2>
        <form onSubmit={handleCreateLocation}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Location Name *
            </label>
            <input
              type="text"
              id="name"
              value={newLocation.name}
              onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              required
            />
          </div>
          {createError && (
            <div className="text-sm text-red-600 mb-4">{createError}</div>
          )}
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create Location
          </button>
        </form>
      </div>
      
      {/* Region filter */}
      <div className="mb-6">
        <label htmlFor="region-filter" className="block text-sm font-medium text-gray-700 mb-1">
          Filter by Region
        </label>
        <select
          id="region-filter"
          value={selectedRegionFilter}
          onChange={(e) => setSelectedRegionFilter(e.target.value)}
          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-64 sm:text-sm border-gray-300 rounded-md"
        >
          <option value="all">All Locations</option>
          <option value="unassigned">Unassigned Locations</option>
          {regions.map((region) => (
            <option key={region.id} value={region.id}>
              {region.name}
            </option>
          ))}
        </select>
      </div>
      
      {/* Locations list */}
      <div className="bg-white shadow overflow-hidden rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Region
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredLocations.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  No locations found
                </td>
              </tr>
            ) : (
              filteredLocations.map((location) => (
                <tr key={location.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {location.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <RegionLocationSelector
                      locationId={location.id}
                      currentRegionId={location.regionId}
                      onUpdate={handleRegionUpdate}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(location.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {isSuperAdmin && (
                      deleteConfirmId === location.id ? (
                        <div className="flex items-center justify-end space-x-2">
                          <span className="text-xs text-red-600 font-normal">Confirm delete?</span>
                          <button
                            onClick={() => handleDeleteLocation(location.id)}
                            disabled={isDeleting}
                            className="text-red-600 hover:text-red-900"
                          >
                            {isDeleting ? 'Deleting...' : 'Yes'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(location.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}