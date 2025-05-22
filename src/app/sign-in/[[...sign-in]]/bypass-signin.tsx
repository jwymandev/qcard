'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

/**
 * Emergency bypass sign-in component that skips normal authentication
 * This is only used when the database connection is not working
 * and should be removed once normal authentication is fixed
 */
export default function BypassSignIn() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const isBypass = searchParams?.get('emergency_bypass') === 'true' || 
                  searchParams?.get('bypass_auth') === 'true' ||
                  searchParams?.get('auth_timeout') === 'true'
  
  if (!isBypass) {
    // Only show this component when one of the bypass parameters is present
    return null
  }
  
  const handleBypass = () => {
    // Set cookies to simulate a logged-in state
    document.cookie = `bypass_auth=true; path=/; max-age=3600`
    document.cookie = `bypass_user=${encodeURIComponent(email)}; path=/; max-age=3600`
    document.cookie = `bypass_name=${encodeURIComponent(name)}; path=/; max-age=3600`
    
    // Determine tenant type from email or provide selection options
    let tenantType = 'talent'; // Default
    
    if (email.includes('studio') || email.includes('admin')) {
      tenantType = 'studio';
    }
    
    // Redirect to dashboard with bypass parameter
    router.push(`/${tenantType}/dashboard?bypass_auth=true`);
  }
  
  return (
    <div className="bg-red-50 border border-red-200 p-4 rounded-md mt-6 mb-6">
      <h2 className="text-lg font-bold text-red-700 mb-2">⚠️ Emergency Bypass Mode</h2>
      <p className="text-sm text-red-600 mb-4">
        This mode bypasses the normal authentication process. Use only during database issues.
      </p>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Enter any email for temporary access"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Enter any name"
          />
        </div>
        
        <div className="mt-3">
          <button
            onClick={handleBypass}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            disabled={!email}
          >
            Emergency Access
          </button>
        </div>
      </div>
      
      <div className="mt-4 text-xs text-red-500">
        <p><strong>Important:</strong> This bypasses security checks and should only be used by administrators during database issues.</p>
      </div>
    </div>
  )
}