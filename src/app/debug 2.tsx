'use client';

import React, { useEffect, useState } from 'react';

export default function DebugPage() {
  const [info, setInfo] = useState({
    url: '',
    cookie: '',
    userAgent: '',
    time: '',
    localStorage: [] as string[],
  });

  useEffect(() => {
    // Gather basic debug info
    const localStorageKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) localStorageKeys.push(key);
    }
    
    setInfo({
      url: window.location.href,
      cookie: document.cookie || 'No cookies',
      userAgent: navigator.userAgent,
      time: new Date().toISOString(),
      localStorage: localStorageKeys,
    });
  }, []);

  // Handle cookie clearing
  const clearCookies = () => {
    document.cookie.split(';').forEach((cookie) => {
      const [name] = cookie.trim().split('=');
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
    });
    window.location.reload();
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ color: '#333' }}>QCard Debug Page</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
        <h2 style={{ fontSize: '18px', marginTop: 0 }}>Basic Information</h2>
        <p><strong>URL:</strong> {info.url}</p>
        <p><strong>Time:</strong> {info.time}</p>
        <p><strong>User Agent:</strong> {info.userAgent}</p>
      </div>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
        <h2 style={{ fontSize: '18px', marginTop: 0 }}>Cookies</h2>
        <pre style={{ 
          backgroundColor: '#fff', 
          padding: '10px', 
          border: '1px solid #ddd', 
          borderRadius: '4px',
          overflowX: 'auto',
          fontSize: '14px'
        }}>
          {info.cookie}
        </pre>
      </div>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
        <h2 style={{ fontSize: '18px', marginTop: 0 }}>Local Storage Keys</h2>
        <ul>
          {info.localStorage.map((key) => (
            <li key={key}>{key}</li>
          ))}
        </ul>
      </div>
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          onClick={() => window.location.href = '/'}
          style={{
            backgroundColor: '#4a88e5',
            color: 'white',
            border: 'none',
            padding: '10px 15px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Go to Homepage
        </button>
        
        <button 
          onClick={clearCookies}
          style={{
            backgroundColor: '#e53935',
            color: 'white',
            border: 'none',
            padding: '10px 15px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Clear All Cookies
        </button>
        
        <button 
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: '#4caf50',
            color: 'white',
            border: 'none',
            padding: '10px 15px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}