'use client';

import { useState, useEffect } from 'react';

export default function DebugSSLPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testUrls, setTestUrls] = useState<{url: string, status: string}[]>([]);

  useEffect(() => {
    const fetchDebugInfo = async () => {
      try {
        const response = await fetch('/api/debug-ssl');
        if (!response.ok) {
          throw new Error(`Failed to fetch debug info: ${response.statusText}`);
        }
        const data = await response.json();
        setDebugInfo(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchDebugInfo();
  }, []);

  const testEndpoint = async (url: string) => {
    setTestUrls(prev => [...prev, { url, status: 'testing...' }]);
    
    try {
      const startTime = performance.now();
      const response = await fetch(url);
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      const status = response.ok 
        ? `OK (${response.status}) - ${duration}ms`
        : `Error (${response.status})`;
        
      setTestUrls(prev => 
        prev.map(item => 
          item.url === url ? { ...item, status } : item
        )
      );
    } catch (err) {
      setTestUrls(prev => 
        prev.map(item => 
          item.url === url ? { ...item, status: `Failed: ${err instanceof Error ? err.message : 'Unknown error'}` } : item
        )
      );
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">SSL/HTTPS Debug Information</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Test API Endpoints</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          <button 
            onClick={() => testEndpoint('/api/health')}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test /api/health
          </button>
          <button 
            onClick={() => testEndpoint('/api/debug-ssl')}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test /api/debug-ssl
          </button>
          <button 
            onClick={() => testEndpoint('/api/auth/check-session')}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test Auth Session
          </button>
        </div>
        
        {testUrls.length > 0 && (
          <div className="mb-6 border p-3 rounded bg-gray-50">
            <h3 className="font-semibold mb-2">Test Results</h3>
            <ul>
              {testUrls.map((test, idx) => (
                <li key={idx} className="mb-1">
                  <span className="font-mono">{test.url}</span>: {test.status}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {loading ? (
        <p>Loading debug information...</p>
      ) : error ? (
        <div className="p-4 bg-red-100 border border-red-300 rounded">
          <p className="text-red-700">Error: {error}</p>
        </div>
      ) : (
        <div>
          <div className="mb-4 p-4 bg-gray-100 rounded">
            <h2 className="text-xl font-semibold mb-2">Connection Status</h2>
            <div className="flex items-center mb-2">
              <div className={`w-4 h-4 rounded-full mr-2 ${debugInfo.isSecure ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <p>{debugInfo.isSecure ? 'Secure HTTPS Connection' : 'Insecure HTTP Connection'}</p>
            </div>
            <p className="text-sm text-gray-600">
              Protocol: <span className="font-mono">{debugInfo.data.request.protocol}</span>
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded">
              <h2 className="text-lg font-semibold mb-3">Request Information</h2>
              <ul className="space-y-2">
                {Object.entries(debugInfo.data.request).map(([key, value]: [string, any]) => (
                  <li key={key} className="flex">
                    <span className="w-32 font-medium">{key}:</span>
                    <span className="font-mono text-sm">{value?.toString()}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="p-4 border rounded">
              <h2 className="text-lg font-semibold mb-3">Environment Configuration</h2>
              <ul className="space-y-2">
                {Object.entries(debugInfo.data.environment).map(([key, value]: [string, any]) => (
                  <li key={key} className="flex">
                    <span className="w-32 font-medium">{key}:</span>
                    <span className="font-mono text-sm">{value?.toString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-4 border rounded">
            <h2 className="text-lg font-semibold mb-3">Server Information</h2>
            <ul className="space-y-2">
              {Object.entries(debugInfo.data.server).map(([key, value]: [string, any]) => (
                <li key={key} className="flex">
                  <span className="w-32 font-medium">{key}:</span>
                  <span className="font-mono text-sm">{value?.toString()}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}