'use client';

export default function EmergencyPage() {
  return (
    <html>
      <head>
        <title>Emergency Access</title>
        <style>{`
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #f44336;
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            margin-bottom: 20px;
          }
          .card {
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 20px;
            margin-bottom: 20px;
            background-color: #f9f9f9;
          }
          button, .button {
            background-color: #4CAF50;
            border: none;
            color: white;
            padding: 10px 20px;
            text-align: center;
            text-decoration: none;
            display: inline-block;
            font-size: 16px;
            margin: 4px 2px;
            cursor: pointer;
            border-radius: 4px;
          }
          .warning {
            background-color: #f44336;
          }
          pre {
            background-color: #f1f1f1;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
          }
        `}</style>
      </head>
      <body>
        <div className="header">
          <h1>QCard Emergency Access</h1>
          <p>This page provides emergency functions to recover from authentication issues</p>
        </div>

        <div className="card">
          <h2>1. Reset All Cookies</h2>
          <p>This will clear all authentication cookies and local storage.</p>
          <button onClick={() => {
            // Clear all cookies
            document.cookie.split(";").forEach(c => {
              document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });
            
            // Clear localStorage
            localStorage.clear();
            
            alert("All cookies and localStorage cleared!");
          }}>
            Clear All Cookies
          </button>
        </div>

        <div className="card">
          <h2>2. Access Sign-In Page</h2>
          <p>Go directly to the sign-in page:</p>
          <a className="button" href="/sign-in">Go to Sign-In</a>
        </div>

        <div className="card">
          <h2>3. Database Reset Instructions</h2>
          <p>To reset your database in Digital Ocean:</p>
          <pre>
{`# Set environment variable to ignore SSL verification
export NODE_TLS_REJECT_UNAUTHORIZED=0

# Run database reset script
node scripts/do-reset-db.js

# Create admin user
node scripts/make-do-admin.js`}
          </pre>
        </div>

        <div className="card">
          <h2>4. Create Direct Database URL</h2>
          <p>Use this command to connect directly to PostgreSQL:</p>
          <pre>
{`psql "postgresql://doadmin:password@db-qcarddevelopment-do-user-15547991-0.k.db.ondigitalocean.com:25060/may19db?sslmode=require" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;"`}
          </pre>
          <p>Then run:</p>
          <pre>
{`NODE_TLS_REJECT_UNAUTHORIZED=0 npx prisma db push`}
          </pre>
        </div>

        <div className="card">
          <h2>5. Manual Navigation</h2>
          <p>Try these links:</p>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/sign-in">Sign In</a></li>
            <li><a href="/sign-up">Sign Up</a></li>
            <li><a href="/auth-debug">Auth Debug</a></li>
          </ul>
        </div>
      </body>
    </html>
  );
}