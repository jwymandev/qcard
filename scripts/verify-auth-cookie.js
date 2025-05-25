/**
 * Verify Auth Cookie
 * 
 * This script checks if a given session cookie is valid
 * by attempting to decode it using the NextAuth secret.
 */

const jwt = require('jsonwebtoken');
const readline = require('readline');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to prompt for input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Function to get environment variable with fallback
function getEnv(name, fallback) {
  return process.env[name] || fallback;
}

// Main function
async function main() {
  console.log('Session Cookie Verification Tool');
  console.log('===============================');
  console.log('This tool verifies if a NextAuth.js session cookie is valid');
  console.log('');
  
  // Get the session token
  const sessionToken = await prompt('Enter session token (copy from browser cookies): ');
  if (!sessionToken) {
    console.error('No session token provided');
    rl.close();
    return;
  }
  
  // Get the secret (default or from env)
  const secret = getEnv('NEXTAUTH_SECRET', 'development-secret');
  
  try {
    // Try to verify and decode the token
    const decoded = jwt.verify(sessionToken, secret, {
      algorithms: ['HS256']
    });
    
    console.log('\n✅ Session token is valid!');
    console.log('\nDecoded Token:');
    console.log(JSON.stringify(decoded, null, 2));
    
    // Check expiration
    if (decoded.exp) {
      const expDate = new Date(decoded.exp * 1000);
      const now = new Date();
      const timeLeft = expDate - now;
      
      console.log(`\nExpires: ${expDate.toLocaleString()}`);
      console.log(`Time left: ${Math.floor(timeLeft / (1000 * 60 * 60))} hours, ${Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))} minutes`);
      
      if (timeLeft < 0) {
        console.log('⚠️ WARNING: Session token has expired!');
      }
    }
    
    // Check for user data
    if (decoded.id) {
      console.log('\nUser Info:');
      console.log(`ID: ${decoded.id}`);
      console.log(`Email: ${decoded.email}`);
      console.log(`Name: ${decoded.name}`);
      console.log(`Role: ${decoded.role}`);
      console.log(`Tenant Type: ${decoded.tenantType}`);
      console.log(`Is Admin: ${decoded.isAdmin}`);
    }
  } catch (error) {
    console.error('\n❌ Error verifying session token:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      console.log('\nThe token is invalid or has been tampered with.');
    } else if (error.name === 'TokenExpiredError') {
      console.log('\nThe token has expired.');
    }
  } finally {
    rl.close();
  }
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  rl.close();
});