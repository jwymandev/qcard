'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface UserFormData {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantType: string;
}

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    firstName: '',
    lastName: '',
    role: 'USER',
    tenantType: 'TALENT',
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

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
            firstName: 'John',
            lastName: 'Doe',
            role: 'USER',
            tenantType: 'TALENT',
          };
          
          setFormData(userData);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error fetching user:', error);
        setError('Failed to load user data');
        setLoading(false);
      }
    }

    fetchUser();
  }, [userId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    // Validate form
    if (!formData.email) {
      setFormError('Email is required');
      return;
    }
    
    try {
      setSaving(true);
      
      // In a real implementation, send to API
      // const response = await fetch(`/api/admin/users/${userId}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData),
      // });
      
      // Simulate API response delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For now, just simulate success
      console.log('User would be updated with:', formData);
      
      // Navigate back to user detail page
      router.push(`/admin/users/${userId}`);
    } catch (error) {
      console.error('Error updating user:', error);
      setFormError('Failed to update user. Please try again.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
        <p>{error}</p>
        <Link href="/admin/users" className="text-red-700 font-medium underline mt-2 inline-block">
          Return to users list
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link 
          href={`/admin/users/${userId}`}
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          ← Back to User Details
        </Link>
        <h1 className="text-2xl font-semibold text-gray-800 mt-2">Edit User</h1>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {formError && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
              {formError}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                id="email"
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                id="role"
                name="role"
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                value={formData.role}
                onChange={handleChange}
              >
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>

            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                id="firstName"
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                value={formData.firstName}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                id="lastName"
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="tenantType" className="block text-sm font-medium text-gray-700 mb-1">
                Tenant Type
              </label>
              <select
                id="tenantType"
                name="tenantType"
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                value={formData.tenantType}
                onChange={handleChange}
              >
                <option value="TALENT">Talent</option>
                <option value="STUDIO">Studio</option>
                <option value="ADMIN">Admin</option>
              </select>
              <p className="mt-1 text-sm text-red-600">
                Warning: Changing tenant type may cause data inconsistencies. Make sure to migrate user data separately.
              </p>
            </div>
          </div>

          <div className="pt-5 border-t border-gray-200">
            <div className="flex justify-end">
              <Link
                href={`/admin/users/${userId}`}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-3"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Reset Password</h2>
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <p className="text-sm text-gray-600 mb-4">
              You can send a password reset email to this user or set a new password directly.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => alert('Password reset email would be sent')}
                className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
              >
                Send Reset Email
              </button>
              <button
                onClick={() => alert('Set new password functionality would go here')}
                className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700"
              >
                Set New Password
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}