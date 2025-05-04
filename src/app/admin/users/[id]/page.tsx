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
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        // In a real implementation, fetch from API
        // const response = await fetch(`/api/admin/users/${userId}`);
        // const data = await response.json();
        
        // For now, simulate API response
        setTimeout(() => {
          if (userId === '404') {
            setError('User not found');
            setLoading(false);
            return;
          }
          
          // Simulate user data
          const userData = {
            id: userId,
            email: 'user@example.com',
            name: 'John Doe',
            firstName: 'John',
            lastName: 'Doe',
            role: 'USER',
            tenantType: 'TALENT',
            tenantName: 'John Doe Talent',
            tenantId: 'tenant123',
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-10T00:00:00Z',
          };
          
          setUser(userData);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error fetching user details:', error);
        setError('Failed to load user details');
        setLoading(false);
      }
    }

    fetchUser();
  }, [userId]);

  const handleResetPassword = () => {
    if (window.confirm('Are you sure you want to reset this user\'s password?')) {
      // In a real implementation, call API
      alert('Password reset functionality would go here.');
    }
  };

  const handleImpersonateUser = () => {
    if (window.confirm('Are you sure you want to impersonate this user?')) {
      // In a real implementation, call API
      alert('User impersonation functionality would go here.');
    }
  };

  const handleDeleteUser = () => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      // In a real implementation, call API
      alert('User deletion functionality would go here.');
      router.push('/admin/users');
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

      <div className="mt-8 mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Actions</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            className="border border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50 cursor-pointer"
            onClick={handleResetPassword}
          >
            <h3 className="text-lg font-medium text-gray-900">Reset Password</h3>
            <p className="mt-1 text-sm text-gray-500">
              Send a password reset email to this user, allowing them to set a new password.
            </p>
          </div>
          
          <div 
            className="border border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50 cursor-pointer"
            onClick={handleImpersonateUser}
          >
            <h3 className="text-lg font-medium text-gray-900">Impersonate User</h3>
            <p className="mt-1 text-sm text-gray-500">
              Log in as this user to see what they see. Your admin session will be restored afterwards.
            </p>
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
                View Talent Profile →
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