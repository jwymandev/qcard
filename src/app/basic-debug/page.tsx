// Simple static page with no client components
export default function BasicDebugPage() {
  return (
    <html>
      <head>
        <title>Basic Debug Page</title>
      </head>
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ color: '#333' }}>QCard Basic Debug Page</h1>
        <p>This is a minimal debug page with no client-side JavaScript.</p>
        
        <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '0.5rem' }}>
          <h2>Static Information</h2>
          <ul>
            <li><strong>Page:</strong> /basic-debug</li>
            <li><strong>Server Time:</strong> {new Date().toISOString()}</li>
            <li><strong>Node Environment:</strong> {process.env.NODE_ENV}</li>
          </ul>
        </div>
        
        <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '0.5rem' }}>
          <h2>Manual Cookie Check</h2>
          <p>To manually check your cookies:</p>
          <ol>
            <li>Open browser developer tools (F12 or right-click &gt; Inspect)</li>
            <li>Go to the "Application" tab (Chrome) or "Storage" tab (Firefox)</li>
            <li>Look for Cookies in the left sidebar</li>
            <li>Check for any "next-auth" related cookies</li>
          </ol>
        </div>
        
        <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '0.5rem' }}>
          <h2>Troubleshooting Links</h2>
          <ul>
            <li><a href="/" style={{ color: '#0070f3' }}>Home Page</a></li>
            <li><a href="/sign-in" style={{ color: '#0070f3' }}>Sign In Page</a></li>
          </ul>
        </div>
        
        <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '0.5rem' }}>
          <h3>Client-Side Test Script</h3>
          <p>Add this script in browser console to test basic browser functionality:</p>
          <pre style={{ backgroundColor: '#eee', padding: '1rem', overflowX: 'auto', fontSize: '0.875rem' }}>
{`// Run this in browser console
(function() {
  console.log('Browser compatibility check:');
  console.log('- localStorage available:', typeof localStorage !== 'undefined');
  console.log('- sessionStorage available:', typeof sessionStorage !== 'undefined');
  console.log('- cookies available:', document.cookie !== undefined);
  console.log('- URL:', window.location.href);
  
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
    console.log('- localStorage working: Yes');
  } catch (e) {
    console.log('- localStorage working: No', e);
  }
})();`}
          </pre>
        </div>
      </body>
    </html>
  );
}