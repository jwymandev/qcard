'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface UserDetail {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantType: string;
  tenantName: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  subscription?: {
    id: string;
    status: string;
    planId: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    isLifetime: boolean;
  } | null;
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        setLoading(true);
        
        // Check admin access first
        const accessCheck = await fetch('/api/admin/check-access');
        if (!accessCheck.ok) {
          console.error('Admin access check failed:', await accessCheck.text());
          setError('You do not have admin permissions to view user details');
          setLoading(false);
          return;
        }
        
        // Fetch user data from API
        const response = await fetch(`/api/admin/users/${userId}`, {
          credentials: 'include' // Important for auth cookies
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('User not found');
            setLoading(false);
            return;
          }
          
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const userData = await response.json();
        console.log('Received user data:', userData);
        
        setUser(userData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user details:', error);
        setError('Failed to load user details');
        setLoading(false);
      }
    }

    fetchUser();
  }, [userId]);

  const [showResetModal, setShowResetModal] = useState(false);
  const [showImpersonateModal, setShowImpersonateModal] = useState(false);

  const handleResetPassword = () => {
    setShowResetModal(true);
  };

  const confirmResetPassword = async () => {
    try {
      setShowResetModal(false);
      setLoading(true);
      
      // Call the reset password API
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to reset password: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Show success message with the temporary password
      alert(`Password has been reset for ${data.email}.\nTemporary password: ${data.temporaryPassword}`);
      setLoading(false);
    } catch (error) {
      console.error('Error resetting password:', error);
      setError('Failed to reset password');
      setLoading(false);
    }
  };

  const handleImpersonateUser = () => {
    setShowImpersonateModal(true);
  };
  
  const confirmImpersonateUser = async () => {
    try {
      setShowImpersonateModal(false);
      setLoading(true);
      
      // Call the impersonate API
      const response = await fetch(`/api/admin/users/${userId}/impersonate`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to impersonate user: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Redirect to the user's dashboard
      if (data.redirectUrl) {
        // Show a brief message before redirecting
        alert('You are now impersonating this user. To revert back to your admin account, log out.');
        window.location.href = data.redirectUrl;
      } else {
        setLoading(false);
        setError('Impersonation successful but no redirect URL was provided');
      }
    } catch (error) {
      console.error('Error impersonating user:', error);
      setError(error instanceof Error ? error.message : 'Failed to impersonate user');
      setLoading(false);
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Subscription management functions
  const grantLifetimeSubscription = async () => {
    const hasExistingSubscription = user?.subscription;
    const confirmMessage = hasExistingSubscription 
      ? 'Grant lifetime subscription to this user? This will cancel their current subscription to stop billing.'
      : 'Grant lifetime subscription to this user?';
      
    if (!confirm(confirmMessage)) return;
    
    setSubscriptionLoading(true);
    setSubscriptionError(null);
    
    try {
      // Always use POST for lifetime subscriptions - API will handle existing subscriptions
      const response = await fetch(`/api/admin/users/${userId}/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          isLifetime: true,
          status: 'ACTIVE'
          // Don't send planId - let the API find/create the lifetime plan
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to grant lifetime subscription');
      }
      
      const result = await response.json();
      console.log('Lifetime subscription granted:', result);
      
      // Show success message if previous subscription was canceled
      if (result.previousSubscriptionCanceled) {
        alert('Lifetime subscription granted successfully! Previous subscription has been canceled to stop billing.');
      }
      
      // Refresh user data
      window.location.reload();
    } catch (error) {
      setSubscriptionError(error instanceof Error ? error.message : 'Failed to grant subscription');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const revokeLifetimeSubscription = async () => {
    if (!confirm('Revoke lifetime access from this user? This will cancel their lifetime subscription.')) return;
    
    setSubscriptionLoading(true);
    setSubscriptionError(null);
    
    try {
      const response = await fetch(`/api/admin/users/${userId}/subscription`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to revoke lifetime subscription');
      }
      
      const result = await response.json();
      console.log('Subscription revoked:', result);
      
      // Show appropriate message based on what was revoked
      const message = result.wasLifetime 
        ? 'Lifetime subscription has been revoked successfully.'
        : 'Subscription has been canceled successfully.';
      alert(message);
      
      // Refresh user data
      window.location.reload();
    } catch (error) {
      setSubscriptionError(error instanceof Error ? error.message : 'Failed to revoke subscription');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const updateSubscriptionStatus = async (status: string) => {
    if (!user?.subscription) {
      setSubscriptionError('User has no subscription to update');
      return;
    }
    
    setSubscriptionLoading(true);
    setSubscriptionError(null);
    
    try {
      const response = await fetch(`/api/admin/users/${userId}/subscription`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update subscription status');
      }
      
      // Refresh user data
      window.location.reload();
    } catch (error) {
      setSubscriptionError(error instanceof Error ? error.message : 'Failed to update subscription');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const removeSubscription = async () => {
    if (!confirm('Remove subscription from this user? This cannot be undone.')) return;
    
    setSubscriptionLoading(true);
    setSubscriptionError(null);
    
    try {
      const response = await fetch(`/api/admin/users/${userId}/subscription`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove subscription');
      }
      
      // Refresh user data
      window.location.reload();
    } catch (error) {
      setSubscriptionError(error instanceof Error ? error.message : 'Failed to remove subscription');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleDeleteUser = () => {
    setShowDeleteModal(true);
    setDeleteConfirmation('');
    setDeleteError(null);
  };
  
  const confirmDelete = async () => {
    // Check if confirmation text matches "delete"
    if (deleteConfirmation.toLowerCase() !== 'delete') {
      setDeleteError('Please type "delete" to confirm');
      return;
    }
    
    try {
      setLoading(true);
      setShowDeleteModal(false);
      
      // Call delete API
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete user. Status: ${response.status}`);
      }
      
      // Redirect to users list on success
      router.push('/admin/users');
    } catch (error) {
      console.error('Error deleting user:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete user');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
        <p>{error || 'User not found'}</p>
        <Link href="/admin/users" className="text-red-700 font-medium underline mt-2 inline-block">
          Return to users list
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Deletion</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to delete this user? This action cannot be undone. Please type <strong>delete</strong> to confirm.
            </p>
            
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="Type 'delete' to confirm"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm mb-3"
            />
            
            {deleteError && (
              <p className="text-sm text-red-600 mb-3">{deleteError}</p>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Reset User Password</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to reset the password for this user? A password reset link will be sent to their email address.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmResetPassword}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Send Reset Link
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Impersonate User Modal */}
      {showImpersonateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Impersonate User</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to impersonate this user? You will see the application as this user would. To return to your admin account, you&apos;ll need to log out.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowImpersonateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmImpersonateUser}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Impersonate User
              </button>
            </div>
          </div>
        </div>
      )}
    
      <div className="mb-6 flex justify-between items-center">
        <div>
          <Link 
            href="/admin/users"
            className="inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            ← Back to Users
          </Link>
          <h1 className="text-2xl font-semibold text-gray-800 mt-2">User Details</h1>
        </div>
        <div className="flex space-x-3">
          <Link
            href={`/admin/users/${userId}/edit`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Edit User
          </Link>
          <button
            onClick={handleDeleteUser}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
          >
            Delete User
          </button>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden rounded-lg">
        <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">{user.name}</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">{user.email}</p>
        </div>
        
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Full name</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {user.firstName} {user.lastName}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">User ID</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user.id}</dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Role</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 
                      user.role === 'SUPER_ADMIN' ? 'bg-red-100 text-red-800' : 
                      'bg-green-100 text-green-800'}`}>
                  {user.role}
                </span>
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Tenant Type</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user.tenantType}</dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Tenant Name</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {user.tenantName}
                {user.tenantId && (
                  <span className="ml-2 text-sm text-gray-500">
                    (ID: {user.tenantId})
                  </span>
                )}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Created At</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {new Date(user.createdAt).toLocaleString()}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Updated At</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {new Date(user.updatedAt).toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Subscription Management Section */}
      <div className="bg-white shadow overflow-hidden rounded-lg mt-6">
        <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Subscription Management</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Manage user subscription and access privileges</p>
        </div>
        
        <div className="border-t border-gray-200">
          {subscriptionError && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <p className="text-sm text-red-700">{subscriptionError}</p>
            </div>
          )}
          
          <dl>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Subscription Status</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {user.subscription ? (
                  <div className="space-y-2">
                    <div>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${user.subscription.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                            user.subscription.status === 'CANCELED' ? 'bg-red-100 text-red-800' : 
                            'bg-yellow-100 text-yellow-800'}`}>
                        {user.subscription.status}
                      </span>
                      {user.subscription.isLifetime && (
                        <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                          LIFETIME
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      Plan: {user.subscription.planId} | 
                      Expires: {user.subscription.isLifetime ? 'Never' : new Date(user.subscription.currentPeriodEnd).toLocaleDateString()}
                    </div>
                  </div>
                ) : (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                    NO SUBSCRIPTION
                  </span>
                )}
              </dd>
            </div>
            
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Admin Actions</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <div className="flex flex-wrap gap-2">
                  {!user.subscription ? (
                    <button
                      onClick={grantLifetimeSubscription}
                      disabled={subscriptionLoading}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                      {subscriptionLoading ? 'Processing...' : 'Grant Lifetime Access'}
                    </button>
                  ) : (
                    <>
                      {!user.subscription.isLifetime ? (
                        <button
                          onClick={grantLifetimeSubscription}
                          disabled={subscriptionLoading}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                        >
                          {subscriptionLoading ? 'Processing...' : 'Make Lifetime'}
                        </button>
                      ) : (
                        <button
                          onClick={revokeLifetimeSubscription}
                          disabled={subscriptionLoading}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                        >
                          {subscriptionLoading ? 'Processing...' : 'Revoke Lifetime Access'}
                        </button>
                      )}
                      
                      {user.subscription.status !== 'ACTIVE' && (
                        <button
                          onClick={() => updateSubscriptionStatus('ACTIVE')}
                          disabled={subscriptionLoading}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                        >
                          {subscriptionLoading ? 'Processing...' : 'Activate'}
                        </button>
                      )}
                      
                      {user.subscription.status === 'ACTIVE' && (
                        <button
                          onClick={() => updateSubscriptionStatus('CANCELED')}
                          disabled={subscriptionLoading}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
                        >
                          {subscriptionLoading ? 'Processing...' : 'Cancel'}
                        </button>
                      )}
                      
                      <button
                        onClick={removeSubscription}
                        disabled={subscriptionLoading}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                      >
                        {subscriptionLoading ? 'Processing...' : 'Remove Subscription'}
                      </button>
                    </>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Use these controls to grant special access or manage subscription status for this user.
                </p>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-8 mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Actions</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            className="border border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={handleResetPassword}
          >
            <h3 className="text-lg font-medium text-gray-900">Reset Password</h3>
            <p className="mt-1 text-sm text-gray-500">
              Send a password reset email to this user, allowing them to set a new password.
            </p>
            <button 
              className="mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none"
              onClick={(e) => {
                e.stopPropagation();
                handleResetPassword();
              }}
            >
              Send Reset Link
            </button>
          </div>
          
          <div 
            className="border border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={handleImpersonateUser}
          >
            <h3 className="text-lg font-medium text-gray-900">Impersonate User</h3>
            <p className="mt-1 text-sm text-gray-500">
              Log in as this user to see what they see. You&apos;ll need to log out to return to your admin account.
            </p>
            <button 
              className="mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none"
              onClick={(e) => {
                e.stopPropagation();
                handleImpersonateUser();
              }}
            >
              Impersonate
            </button>
          </div>
        </div>
      </div>
      
      {user.tenantType === 'TALENT' && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Talent Profile</h2>
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <Link 
                href={`/admin/talents/profile/${user.tenantId}`}
                className="text-blue-600 hover:text-blue-800"
              >
                View Talent Profile &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}
      
      {user.tenantType === 'STUDIO' && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Studio Details</h2>
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <Link 
                href={`/admin/studios/${user.tenantId}`}
                className="text-blue-600 hover:text-blue-800"
              >
                View Studio Details →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}