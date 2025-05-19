'use client';

// A very simple error component for the basic debug page
export default function BasicDebugError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ color: 'red' }}>Error in Basic Debug Page</h1>
      <p>Something went wrong in the basic debug page:</p>
      <pre style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '15px', 
        border: '1px solid #ddd', 
        borderRadius: '5px', 
        overflow: 'auto' 
      }}>{error.message}</pre>
      
      <button 
        onClick={reset}
        style={{
          backgroundColor: 'blue',
          color: 'white',
          border: 'none',
          padding: '10px 15px',
          borderRadius: '5px',
          marginTop: '15px',
          cursor: 'pointer'
        }}
      >
        Try Again
      </button>
    </div>
  );
}