'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { isUserAdmin } from '@/lib/client-admin-helpers';

interface Discount {
  id: string;
  regionCount: number;
  discountPercentage: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function DiscountsAdminPage() {
  const { data: session } = useSession();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const isAdmin = isUserAdmin(session);

  // Fetch discounts on load
  useEffect(() => {
    if (isAdmin) {
      fetchDiscounts();
    }
  }, [isAdmin]);

  // Fetch discount tiers
  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/discounts');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch discounts: ${response.status}`);
      }
      
      const data = await response.json();
      // Sort by region count ascending
      const sortedData = data.sort((a: Discount, b: Discount) => a.regionCount - b.regionCount);
      setDiscounts(sortedData);
    } catch (error) {
      console.error('Error fetching discounts:', error);
      setError('Failed to load discount tiers. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Start editing a discount
  const startEditing = (discount: Discount) => {
    setIsEditing(discount.id);
    setEditingDiscount({
      ...discount,
    });
  };

  // Cancel editing
  const cancelEditing = () => {
    setIsEditing(null);
    setEditingDiscount(null);
  };

  // Save edited discount
  const saveDiscount = async () => {
    if (!editingDiscount) return;
    
    try {
      setSaveStatus('saving');
      const response = await fetch(`/api/admin/discounts/${editingDiscount.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          discountPercentage: editingDiscount.discountPercentage,
          active: editingDiscount.active
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update discount');
      }
      
      // Reset editing state and refresh data
      setIsEditing(null);
      setEditingDiscount(null);
      setSaveStatus('success');
      fetchDiscounts();
      
      // Reset status after delay
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('Error updating discount:', error);
      setError('Failed to update discount. Please try again.');
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
          <h1 className="text-2xl font-semibold text-gray-800">Multi-Region Discount Tiers</h1>
          <p className="text-gray-600">
            Manage discount percentages for multiple region subscriptions
          </p>
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
              <p className="text-sm font-medium text-green-800">Discount updated successfully!</p>
            </div>
          </div>
        </div>
      )}
      
      {/* How It Works section */}
      <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h2 className="text-lg font-medium text-blue-800 mb-2">How Multi-Region Discounts Work</h2>
        <p className="text-blue-700 mb-2">
          This feature allows you to provide discounts to users who subscribe to multiple filming regions.
        </p>
        <ul className="list-disc list-inside text-blue-700 mb-2">
          <li>Set a discount percentage for each number of regions (2, 3, 4, etc.)</li>
          <li>Users will automatically get the best applicable discount</li>
          <li>Discounts are applied to the total price of all selected regions</li>
        </ul>
        <p className="text-blue-700 font-medium">
          Example: If a 2-region discount is 10% and a user subscribes to West Coast ($19.99) and 
          Northeast ($19.99), they&apos;ll pay $35.98 instead of $39.98.
        </p>
      </div>
      
      {/* Discounts list */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {loading ? (
          <div className="p-6 text-center">
            <svg className="animate-spin h-8 w-8 mx-auto text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-2 text-gray-500">Loading discount tiers...</p>
          </div>
        ) : discounts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Region Count
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Discount Percentage
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
                {discounts.map((discount) => (
                  <tr key={discount.id}>
                    {isEditing === discount.id ? (
                      // Editing mode
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {discount.regionCount} Regions
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              value={editingDiscount?.discountPercentage || 0}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                setEditingDiscount(prev => prev ? { 
                                  ...prev, 
                                  discountPercentage: isNaN(value) ? 0 : Math.min(100, Math.max(0, value)) 
                                } : null);
                              }}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-20 sm:text-sm border-gray-300 rounded-md mr-2"
                            />
                            <span className="text-gray-500">%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={editingDiscount?.active ? 'true' : 'false'}
                            onChange={(e) => setEditingDiscount(prev => prev ? { 
                              ...prev, 
                              active: e.target.value === 'true' 
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
                              onClick={saveDiscount}
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
                          <div className="text-sm font-medium text-gray-900">
                            {discount.regionCount} Regions
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {discount.id}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-lg font-bold text-blue-600">
                            {discount.discountPercentage}%
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            discount.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {discount.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => startEditing(discount)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Edit
                          </button>
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
            <p className="text-gray-500">No discount tiers found.</p>
          </div>
        )}
      </div>
    </div>
  );
}