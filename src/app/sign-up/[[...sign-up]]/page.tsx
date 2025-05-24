'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    userType: 'TALENT', // Default to talent
    terms: false,
    submissionId: '', // To store the ID of the casting submission if coming from QR code
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUserTypeEditable, setIsUserTypeEditable] = useState(true);
  const router = useRouter();
  
  // Check for prefilled data from URL query params (from QR code application)
  useEffect(() => {
    const firstName = searchParams.get('firstName');
    const lastName = searchParams.get('lastName');
    const email = searchParams.get('email');
    const phoneNumber = searchParams.get('phoneNumber');
    const submissionId = searchParams.get('submissionId');
    
    console.log('URL parameters:', { firstName, lastName, email, phoneNumber, submissionId });
    
    // Always set data from URL parameters if available
    if (firstName || lastName || email || phoneNumber || submissionId) {
      // If coming from casting submission, always set as TALENT
      setFormData(prev => ({
        ...prev,
        firstName: firstName || prev.firstName,
        lastName: lastName || prev.lastName,
        email: email || prev.email,
        phoneNumber: phoneNumber || prev.phoneNumber,
        submissionId: submissionId || prev.submissionId,
        // Always default to TALENT when coming from QR code
        userType: 'TALENT',
      }));
    }
    
    // If there's a submission ID, display a message about the application
    if (submissionId) {
      console.log('Creating account from casting submission:', submissionId);
      // Lock user type to talent when coming from QR code
      setIsUserTypeEditable(false);
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleUserTypeChange = (userType: string) => {
    setFormData(prev => ({ ...prev, userType }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('First name, last name, email, password, and password confirmation are required');
      return;
    }
    
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (!formData.terms) {
      setError('You must agree to the Terms and Privacy Policy');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      console.log("Registering new user...");
      
      // Register user with a simplified approach
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          password: formData.password,
          userType: formData.userType,
          submissionId: formData.submissionId || undefined,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Registration failed');
      }
      
      console.log("Registration successful! Redirecting to sign-in page...");
      
      // Skip auto sign-in for now and just redirect to sign-in page
      // This avoids the CredentialsSignin error after registration
      router.push('/sign-in?registered=true');
      return;
      
      // Check if there's an external actor record for this email and convert if found
      if (formData.userType === 'TALENT') {
        try {
          console.log("Checking for external actor records...");
          const externalActorResponse = await fetch('/api/auth/convert-external-actor');
          const externalActorData = await externalActorResponse.json();
          
          if (externalActorData.converted) {
            console.log('Converted from external actor:', externalActorData.message);
          }
        } catch (error) {
          console.error('Error checking for external actor conversion:', error);
          // Continue with sign-in even if conversion check fails
        }
      }
      
      console.log("Sign-in successful, redirecting to role-redirect page");
      // Use window.location for a complete page reload
      // This ensures all session data is properly initialized
      window.location.href = '/role-redirect';
    } catch (error: any) {
      console.error("Registration error:", error);
      setError(error.message || 'An error occurred during registration');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          {formData.submissionId ? (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-center text-sm text-blue-700">
                Complete your account setup to continue with your application. Your information has been prefilled from your submission.
              </p>
            </div>
          ) : (
            <p className="mt-2 text-center text-sm text-gray-600">
              Or{' '}
              <Link
                href="/sign-in"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                sign in to your existing account
              </Link>
            </p>
          )}
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="flex space-x-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Phone number (optional)
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                autoComplete="tel"
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Phone number"
                value={formData.phoneNumber}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password (min. 8 characters)"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Type 
                {!isUserTypeEditable && (
                  <span className="ml-2 text-xs text-blue-600 font-normal">
                    (Fixed: Creating a talent account from submission)
                  </span>
                )}
              </label>
              <div className="grid grid-cols-2 gap-4 mt-1">
                <div
                  className={`border rounded-md p-3 ${isUserTypeEditable ? 'cursor-pointer' : ''} ${
                    formData.userType === 'TALENT'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onClick={() => isUserTypeEditable && handleUserTypeChange('TALENT')}
                  data-user-type="TALENT"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">Talent</div>
                    {formData.userType === 'TALENT' && (
                      <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Join as an extra or talent</p>
                </div>
                
                <div
                  className={`border rounded-md p-3 ${
                    formData.userType === 'STUDIO'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-gray-400'
                  } ${isUserTypeEditable ? 'cursor-pointer' : 'opacity-50'}`}
                  onClick={() => isUserTypeEditable && handleUserTypeChange('STUDIO')}
                  data-user-type="STUDIO"
                  style={{ pointerEvents: isUserTypeEditable ? 'auto' : 'none' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">Studio</div>
                    {formData.userType === 'STUDIO' && (
                      <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Find talent for your productions</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={formData.terms}
              onChange={handleChange}
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
              I agree to the Terms and Privacy Policy
            </label>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
            >
              {isLoading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}