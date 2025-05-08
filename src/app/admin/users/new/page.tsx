'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface UserFormData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
  role: string;
  tenantType: string;
}

export default function CreateUserPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    role: 'USER',
    tenantType: 'TALENT',
  });
  
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    // Email validation
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      setFormError('Please enter a valid email address');
      return false;
    }
    
    // Password validation
    if (formData.password.length < 8) {
      setFormError('Password must be at least 8 characters long');
      return false;
    }
    
    // Password confirmation
    if (formData.password !== formData.confirmPassword) {
      setFormError('Passwords do not match');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    try {
      setSaving(true);
      
      // Check admin access first
      const accessCheck = await fetch('/api/admin/check-access');
      if (!accessCheck.ok) {
        console.error('Admin access check failed:', await accessCheck.text());
        setFormError('You do not have admin permissions to create users');
        setSaving(false);
        return;
      }
      
      // Send to API
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important for auth cookies
        body: JSON.stringify({
          email: formData.email,
          firstName: formData.firstName || undefined,
          lastName: formData.lastName || undefined,
          password: formData.password,
          role: formData.role,
          tenantType: formData.tenantType,
        }),
      });
      
      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = 'Failed to create user. Please try again.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          if (errorData.details) {
            console.error('Validation details:', errorData.details);
            // Show first validation error if available
            if (typeof errorData.details === 'object') {
              const firstError = Object.values(errorData.details).flat()[0];
              if (firstError) {
                errorMessage = `${errorMessage}: ${firstError}`;
              }
            }
          }
        } catch (e) {
          console.error('Error parsing API error response:', e);
        }
        
        setFormError(errorMessage);
        setSaving(false);
        return;
      }
      
      const userData = await response.json();
      console.log('User created successfully:', userData);
      
      // Navigate back to users list
      router.push('/admin/users');
    } catch (error) {
      console.error('Error creating user:', error);
      setFormError('Failed to create user. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Link 
          href="/admin/users"
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          ← Back to Users
        </Link>
        <h1 className="text-2xl font-semibold text-gray-800 mt-2">Create New User</h1>
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
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                id="email"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                id="role"
                name="role"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formData.role}
                onChange={handleChange}
                required
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
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="password"
                id="password"
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
              />
              <p className="mt-1 text-xs text-gray-500">
                Must be at least 8 characters
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="confirmPassword"
                id="confirmPassword"
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label htmlFor="tenantType" className="block text-sm font-medium text-gray-700 mb-1">
                Tenant Type <span className="text-red-500">*</span>
              </label>
              <select
                id="tenantType"
                name="tenantType"
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                value={formData.tenantType}
                onChange={handleChange}
                required
              >
                <option value="TALENT">Talent</option>
                <option value="STUDIO">Studio</option>
                <option value="ADMIN">Admin</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Determines the type of account to create
              </p>
            </div>
          </div>

          <div className="pt-5 border-t border-gray-200">
            <div className="flex justify-end">
              <Link
                href="/admin/users"
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-3"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
              >
                {saving ? 'Creating User...' : 'Create User'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}