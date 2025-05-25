'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
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

interface Subscription {
  id: string;
  userId: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

export default function RegionPlanDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [plan, setPlan] = useState<RegionPlan | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPlan, setEditedPlan] = useState<{ name: string; description: string; price: string; isActive: boolean }>({ name: '', description: '', price: '', isActive: true });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  
  const isAdmin = isUserAdmin(session);
  const planId = params.id;
  
  // Fetch plan details
  useEffect(() => {
    async function fetchData() {
      if (!isAdmin) return;
      
      try {
        setLoading(true);
        
        // Fetch region plan details
        const planResponse = await fetch(`/api/admin/region-plans/${planId}`, {
          credentials: 'include'
        });
        
        if (!planResponse.ok) {
          if (planResponse.status === 404) {
            throw new Error('Region plan not found');
          }
          throw new Error(`Failed to fetch region plan: ${planResponse.status}`);
        }
        
        const planData = await planResponse.json();
        setPlan(planData);
        setEditedPlan({
          name: planData.name,
          description: planData.description || '',
          price: planData.price.toString(),
          isActive: planData.isActive
        });
        
        // Fetch active subscriptions for this plan
        const subscriptionsResponse = await fetch(`/api/admin/region-plans/${planId}/subscriptions`, {
          credentials: 'include'
        }).catch(() => {
          console.log('Subscriptions endpoint not available yet');
          return { ok: false };
        });
        
        if (subscriptionsResponse.ok) {
          const subscriptionsData = await subscriptionsResponse.json();
          setSubscriptions(subscriptionsData);
        }
        
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load region plan data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [isAdmin, planId]);
  
  // Update plan
  const handleSavePlan = async () => {
    if (!editedPlan.name.trim()) {
      setError('Plan name is required');
      return;
    }
    
    if (!editedPlan.price.trim() || isNaN(parseFloat(editedPlan.price))) {
      setError('Please enter a valid price');
      return;
    }
    
    try {
      setSaveStatus('saving');
      
      const response = await fetch(`/api/admin/region-plans/${planId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editedPlan.name,
          description: editedPlan.description,
          price: parseFloat(editedPlan.price),
          isActive: editedPlan.isActive
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update region plan');
      }
      
      const updatedPlan = await response.json();
      setPlan(updatedPlan);
      setIsEditing(false);
      setSaveStatus('success');
      
      // Reset status after a delay
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('Error updating region plan:', error);
      setError('Failed to update region plan. Please try again.');
      setSaveStatus('error');
    }
  };
  
  // Delete plan
  const handleDeletePlan = async () => {
    try {
      setSaveStatus('saving');
      
      const response = await fetch(`/api/admin/region-plans/${planId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle the case where the plan has active subscriptions
        if (response.status === 400 && errorData.activeSubscriptionsCount) {
          setError(`Cannot delete plan with ${errorData.activeSubscriptionsCount} active subscriptions`);
          setDeleteConfirm(false);
          setSaveStatus('error');
          return;
        }
        
        throw new Error(errorData.error || 'Failed to delete region plan');
      }
      
      // Redirect to plans list after successful deletion
      router.push('/admin/subscriptions/regions');
    } catch (error) {
      console.error('Error deleting region plan:', error);
      setError('Failed to delete region plan. Please try again.');
      setSaveStatus('error');
      setDeleteConfirm(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };
  
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
  
  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading plan details...</p>
      </div>
    );
  }
  
  if (error && !plan) {
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
        <Link href="/admin/subscriptions/regions" className="text-blue-600 hover:text-blue-800">
          &larr; Back to Region Plans
        </Link>
      </div>
    );
  }
  
  if (!plan) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">Region plan not found</p>
        <Link href="/admin/subscriptions/regions" className="mt-4 text-blue-600 hover:text-blue-800">
          &larr; Back to Region Plans
        </Link>
      </div>
    );
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
                <Link href="/admin/subscriptions/regions" className="text-gray-700 hover:text-blue-600">
                  Region Plans
                </Link>
              </div>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <svg className="w-3 h-3 text-gray-400 mx-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                </svg>
                <span className="text-gray-500">{plan.name}</span>
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
      
      {/* Plan details card */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">Region Plan Details</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Details and properties of the region plan.</p>
          </div>
          {!isEditing && (
            <div className="flex space-x-2">
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Edit Plan
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
              <form onSubmit={(e) => { e.preventDefault(); handleSavePlan(); }}>
                <div className="mb-4">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Plan Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={editedPlan.name}
                    onChange={(e) => setEditedPlan({ ...editedPlan, name: e.target.value })}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    required
                  />
                </div>
                
                <div className="mb-4">
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
                      value={editedPlan.price}
                      onChange={(e) => setEditedPlan({ ...editedPlan, price: e.target.value })}
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                      placeholder="0.00"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">USD</span>
                    </div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="isActive" className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    id="isActive"
                    value={editedPlan.isActive ? 'true' : 'false'}
                    onChange={(e) => setEditedPlan({ ...editedPlan, isActive: e.target.value === 'true' })}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
                
                <div className="mb-6">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={editedPlan.description}
                    onChange={(e) => setEditedPlan({ ...editedPlan, description: e.target.value })}
                    rows={3}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditedPlan({ 
                        name: plan.name, 
                        description: plan.description || '', 
                        price: plan.price.toString(),
                        isActive: plan.isActive
                      });
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
                <dt className="text-sm font-medium text-gray-500">Plan Name</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{plan.name}</dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Region</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{plan.region.name}</dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Price</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">${plan.price.toFixed(2)} / month</dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    plan.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </span>
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {plan.description || <span className="text-gray-400 italic">No description provided</span>}
                </dd>
              </div>
              {plan.stripePriceId && (
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Stripe Price ID</dt>
                  <dd className="mt-1 text-sm font-mono text-gray-900 sm:mt-0 sm:col-span-2">{plan.stripePriceId}</dd>
                </div>
              )}
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{formatDate(plan.createdAt)}</dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{formatDate(plan.updatedAt)}</dd>
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
              Are you sure you want to delete the plan "{plan.name}" for {plan.region.name}? This action cannot be undone.
            </p>
            <p className="text-sm text-gray-700 mb-6">
              <strong>Note:</strong> Plans with active subscriptions cannot be deleted.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePlan}
                disabled={saveStatus === 'saving'}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                {saveStatus === 'saving' ? 'Deleting...' : 'Delete Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Active Subscriptions section */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Active Subscriptions</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Users currently subscribed to this regional plan
          </p>
        </div>
        
        <div className="border-t border-gray-200">
          {subscriptions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Period
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subscriptions.map((subscription) => (
                    <tr key={subscription.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {subscription.user.firstName} {subscription.user.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{subscription.user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          subscription.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                          subscription.status === 'PAST_DUE' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {subscription.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/admin/users/${subscription.userId}`} className="text-indigo-600 hover:text-indigo-900">
                          View User
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-5 text-center text-gray-500">
              No active subscriptions for this plan.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}