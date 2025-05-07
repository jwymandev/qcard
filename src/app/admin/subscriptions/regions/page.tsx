'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { isUserAdmin } from '@/lib/client-admin-helpers';

interface Region {
  id: string;
  name: string;
  description?: string;
}

interface RegionPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  isActive: boolean;
  stripePriceId?: string;
  regionId: string;
  region: Region;
  createdAt: string;
  updatedAt: string;
}

export default function RegionPlansAdminPage() {
  const { data: session } = useSession();
  const [regions, setRegions] = useState<Region[]>([]);
  const [regionPlans, setRegionPlans] = useState<RegionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [newPlan, setNewPlan] = useState({
    regionId: '',
    name: '',
    description: '',
    price: '19.99',
    isActive: true
  });
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<RegionPlan | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const isAdmin = isUserAdmin(session);

  // Fetch regions and plans on load
  useEffect(() => {
    if (isAdmin) {
      fetchRegions();
      fetchRegionPlans();
    }
  }, [isAdmin]);

  // Fetch regions
  const fetchRegions = async () => {
    try {
      const response = await fetch('/api/regions');
      if (!response.ok) {
        throw new Error(`Failed to fetch regions: ${response.status}`);
      }
      const data = await response.json();
      setRegions(data);
    } catch (error) {
      console.error('Error fetching regions:', error);
      setError('Failed to load regions. Please try again later.');
    }
  };

  // Fetch region plans
  const fetchRegionPlans = async () => {
    try {
      setLoading(true);
      const url = selectedRegion === 'all' 
        ? '/api/admin/region-plans'
        : `/api/admin/region-plans?regionId=${selectedRegion}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch region plans: ${response.status}`);
      }
      
      const data = await response.json();
      setRegionPlans(data);
    } catch (error) {
      console.error('Error fetching region plans:', error);
      setError('Failed to load region plans. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Handle region filter change
  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRegion(e.target.value);
  };

  // Update filter and refresh data
  useEffect(() => {
    if (isAdmin) {
      fetchRegionPlans();
    }
  }, [selectedRegion, isAdmin]);

  // Create a new region plan
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPlan.regionId) {
      setError('Please select a region');
      return;
    }
    
    if (!newPlan.name.trim()) {
      setError('Plan name is required');
      return;
    }
    
    if (!newPlan.price || isNaN(parseFloat(newPlan.price))) {
      setError('Please enter a valid price');
      return;
    }
    
    try {
      setSaveStatus('saving');
      const response = await fetch('/api/admin/region-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPlan),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create region plan');
      }
      
      // Reset form and refresh data
      setNewPlan({
        regionId: '',
        name: '',
        description: '',
        price: '19.99',
        isActive: true
      });
      setIsCreating(false);
      setSaveStatus('success');
      fetchRegionPlans();
      
      // Reset status after delay
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('Error creating region plan:', error);
      setError('Failed to create region plan. Please try again.');
      setSaveStatus('error');
    }
  };

  // Start editing a plan
  const startEditing = (plan: RegionPlan) => {
    setIsEditing(plan.id);
    setEditingPlan({
      ...plan,
    });
  };

  // Cancel editing
  const cancelEditing = () => {
    setIsEditing(null);
    setEditingPlan(null);
  };

  // Save edited plan
  const savePlan = async () => {
    if (!editingPlan) return;
    
    try {
      setSaveStatus('saving');
      const response = await fetch(`/api/admin/region-plans/${editingPlan.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editingPlan.name,
          description: editingPlan.description,
          price: editingPlan.price,
          isActive: editingPlan.isActive
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update region plan');
      }
      
      // Reset editing state and refresh data
      setIsEditing(null);
      setEditingPlan(null);
      setSaveStatus('success');
      fetchRegionPlans();
      
      // Reset status after delay
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('Error updating region plan:', error);
      setError('Failed to update region plan. Please try again.');
      setSaveStatus('error');
    }
  };

  // Delete a plan
  const deletePlan = async (id: string) => {
    try {
      setSaveStatus('saving');
      const response = await fetch(`/api/admin/region-plans/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete region plan');
      }
      
      // Reset state and refresh data
      setConfirmDelete(null);
      setSaveStatus('success');
      fetchRegionPlans();
      
      // Reset status after delay
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('Error deleting region plan:', error);
      setError('Failed to delete region plan. Please try again.');
      setSaveStatus('error');
    }
  };

  // If not admin, show access denied
  if (!isAdmin) {
    return (
      <div className="p-6 bg-red-50 rounded-lg border border-red-200">
        <h1 className="text-xl font-bold text-red-700">Access Denied</h1>
        <p className="text-red-600 mt-2">You need admin privileges to access this page.</p>
        <Link href="/dashboard" className="mt-4 inline-flex items-center text-blue-600 hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Regional Subscription Plans</h1>
          <p className="text-gray-600">
            Manage subscription plans for each region
          </p>
        </div>
        
        <div className="flex space-x-4">
          <select
            value={selectedRegion}
            onChange={handleRegionChange}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Regions</option>
            {regions.map(region => (
              <option key={region.id} value={region.id}>{region.name}</option>
            ))}
          </select>
          
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add New Plan
          </button>
        </div>
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
              <p className="text-sm font-medium text-green-800">Operation completed successfully!</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Create plan form */}
      {isCreating && (
        <div className="mb-6 bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Create New Regional Plan</h2>
          <form onSubmit={handleCreatePlan}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="regionId" className="block text-sm font-medium text-gray-700 mb-1">
                  Region *
                </label>
                <select
                  id="regionId"
                  value={newPlan.regionId}
                  onChange={(e) => setNewPlan({ ...newPlan, regionId: e.target.value })}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  required
                >
                  <option value="">-- Select Region --</option>
                  {regions.map(region => (
                    <option key={region.id} value={region.id}>{region.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Plan Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={newPlan.name}
                  onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                  Price *
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="text"
                    id="price"
                    value={newPlan.price}
                    onChange={(e) => setNewPlan({ ...newPlan, price: e.target.value })}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                    placeholder="0.00"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">USD</span>
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="isActive" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="isActive"
                  value={newPlan.isActive ? 'true' : 'false'}
                  onChange={(e) => setNewPlan({ ...newPlan, isActive: e.target.value === 'true' })}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                  rows={2}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveStatus === 'saving'}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {saveStatus === 'saving' ? 'Creating...' : 'Create Plan'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Region plans list */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {loading ? (
          <div className="p-6 text-center">
            <svg className="animate-spin h-8 w-8 mx-auto text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-2 text-gray-500">Loading region plans...</p>
          </div>
        ) : regionPlans.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Region
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {regionPlans.map((plan) => (
                  <tr key={plan.id}>
                    {isEditing === plan.id ? (
                      // Editing mode
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={editingPlan?.name || ''}
                            onChange={(e) => setEditingPlan(prev => prev ? { ...prev, name: e.target.value } : null)}
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {plan.region.name}
                        </td>
                        <td className="px-6 py-4">
                          <textarea
                            value={editingPlan?.description || ''}
                            onChange={(e) => setEditingPlan(prev => prev ? { ...prev, description: e.target.value } : null)}
                            rows={2}
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-500 sm:text-sm">$</span>
                            </div>
                            <input
                              type="text"
                              value={editingPlan?.price || 0}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                setEditingPlan(prev => prev ? { 
                                  ...prev, 
                                  price: isNaN(value) ? 0 : value 
                                } : null);
                              }}
                              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={editingPlan?.isActive ? 'true' : 'false'}
                            onChange={(e) => setEditingPlan(prev => prev ? { 
                              ...prev, 
                              isActive: e.target.value === 'true' 
                            } : null)}
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          >
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={savePlan}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      // View mode
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{plan.name}</div>
                          <div className="text-xs text-gray-500">ID: {plan.id}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{plan.region.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500 max-w-md truncate">
                            {plan.description || 'No description'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">${plan.price.toFixed(2)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            plan.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {plan.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {confirmDelete === plan.id ? (
                            <div className="flex items-center justify-end space-x-2">
                              <span className="text-xs text-red-600 font-normal">Confirm delete?</span>
                              <button
                                onClick={() => deletePlan(plan.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end space-x-4">
                              <button
                                onClick={() => startEditing(plan)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setConfirmDelete(plan.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center">
            <p className="text-gray-500">No region plans found.</p>
            <button
              onClick={() => setIsCreating(true)}
              className="mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              + Add your first plan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}