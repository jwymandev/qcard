'use client';

import React from 'react';

export default function DatabaseMismatchPage() {
  return (
    <div style={{ 
      fontFamily: 'system-ui, sans-serif',
      maxWidth: '800px', 
      margin: '40px auto',
      padding: '20px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #e9ecef',
      borderRadius: '8px'
    }}>
      <h1 style={{ color: '#dc3545', marginBottom: '20px' }}>Database Schema Mismatch Detected</h1>
      
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '6px', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '1.2rem', marginTop: 0 }}>Current Status:</h2>
        <p>
          Your application code has been reverted to a previous version, but your database schema has already been 
          migrated to a newer version. This causes authentication and data access issues.
        </p>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '6px' }}>
          <h3 style={{ color: '#0d6efd', marginTop: 0 }}>Option 1: Update Your Code</h3>
          <p>Return to the latest code that matches your current database schema:</p>
          <pre style={{ backgroundColor: '#f1f3f5', padding: '10px', overflowX: 'auto' }}>
            git pull origin main
          </pre>
          <p>Or return to a specific commit that's compatible with your database:</p>
          <pre style={{ backgroundColor: '#f1f3f5', padding: '10px', overflowX: 'auto' }}>
            git checkout [commit-hash]
          </pre>
        </div>
        
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '6px' }}>
          <h3 style={{ color: '#198754', marginTop: 0 }}>Option 2: Rollback Database</h3>
          <p>Reset your database to match your current code version:</p>
          <pre style={{ backgroundColor: '#f1f3f5', padding: '10px', overflowX: 'auto' }}>
            npx prisma migrate reset
          </pre>
          <p><strong>Warning:</strong> This will delete all your data!</p>
        </div>
      </div>
      
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '6px', marginBottom: '30px' }}>
        <h3 style={{ color: '#fd7e14', marginTop: 0 }}>Temporary Workaround</h3>
        <p>To access your app temporarily while deciding on a permanent solution:</p>
        <ul style={{ paddingLeft: '20px' }}>
          <li>Use the <strong>Emergency Bypass</strong> button on the loading screen</li>
          <li>Add <code>?bypass_auth=true</code> to any URL to skip auth checks</li>
          <li>Note: This won't fix database-dependent features</li>
        </ul>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <a 
          href="/"
          style={{
            display: 'inline-block',
            backgroundColor: '#6c757d',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '4px',
            textDecoration: 'none',
            fontWeight: 'bold',
          }}
        >
          Return Home
        </a>
        
        <a 
          href="/?bypass_auth=true"
          style={{
            display: 'inline-block',
            backgroundColor: '#0d6efd',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '4px',
            textDecoration: 'none',
            fontWeight: 'bold',
          }}
        >
          Continue with Auth Bypass
        </a>
      </div>
    </div>
  );
}