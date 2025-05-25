/**
 * Debug Authentication Flow
 * 
 * This script helps diagnose authentication issues by making direct API requests
 * to the authentication endpoints and displaying the results.
 */

const fetch = require('node-fetch');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Base URL for API requests
const BASE_URL = 'http://localhost:3002';

// Function to prompt for input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Store cookies between requests
let cookies = [];

// Function to make authenticated fetch requests
async function fetchWithCookies(url, options = {}) {
  // Add cookies to the request
  if (cookies.length > 0) {
    options.headers = {
      ...options.headers,
      Cookie: cookies.join('; ')
    };
  }

  // Make the request
  const response = await fetch(url, {
    ...options,
    credentials: 'include'
  });

  // Update cookies from the response
  const setCookieHeader = response.headers.raw()['set-cookie'];
  if (setCookieHeader) {
    cookies = setCookieHeader.map(cookie => cookie.split(';')[0]);
  }

  return response;
}

// Function to get CSRF token
async function getCsrfToken() {
  console.log('Fetching CSRF token...');
  const response = await fetchWithCookies(`${BASE_URL}/api/auth/csrf`);
  const data = await response.json();
  return data.csrfToken;
}

// Function to attempt login
async function login(email, password) {
  console.log(`Attempting to log in as ${email}...`);
  
  // Get CSRF token
  const csrfToken = await getCsrfToken();
  
  // Make login request
  const response = await fetchWithCookies(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password,
      csrfToken,
      json: true
    })
  });
  
  console.log(`Login response status: ${response.status}`);
  
  if (response.redirected) {
    console.log(`Redirected to: ${response.url}`);
  }
  
  return response;
}

// Function to check session
async function checkSession() {
  console.log('Checking session...');
  const response = await fetchWithCookies(`${BASE_URL}/api/auth/session`);
  return response.json();
}

// Function to debug session
async function debugSession() {
  console.log('Getting detailed session debug info...');
  const response = await fetchWithCookies(`${BASE_URL}/api/auth/debug-session`);
  return response.json();
}

// Function to check auth status
async function checkAuthStatus() {
  console.log('Checking auth status...');
  const response = await fetchWithCookies(`${BASE_URL}/api/auth/auth-status`);
  return response.json();
}

// Function to access protected route
async function accessProtectedRoute(route) {
  console.log(`Attempting to access protected route: ${route}...`);
  try {
    const response = await fetchWithCookies(`${BASE_URL}${route}`);
    console.log(`Response status: ${response.status}`);
    if (response.redirected) {
      console.log(`Redirected to: ${response.url}`);
    }
    return response;
  } catch (error) {
    console.error(`Error accessing ${route}:`, error);
    return null;
  }
}

// Main function
async function main() {
  console.log('=== Authentication Flow Debugger ===');
  
  try {
    const email = await prompt('Email: ');
    const password = await prompt('Password: ');
    
    // Step 1: Attempt login
    const loginResponse = await login(email, password);
    
    // Step 2: Check session
    const sessionData = await checkSession();
    console.log('\nSession Data:');
    console.log(JSON.stringify(sessionData, null, 2));
    
    // Step 3: Get detailed session debug info
    const debugData = await debugSession();
    console.log('\nDetailed Session Debug:');
    console.log(JSON.stringify(debugData, null, 2));
    
    // Step 4: Check auth status
    const authStatusData = await checkAuthStatus();
    console.log('\nAuth Status:');
    console.log(JSON.stringify(authStatusData, null, 2));
    
    // Step 5: Try to access protected routes
    console.log('\nTesting protected routes...');
    
    const routes = [
      '/role-redirect',
      '/dashboard',
      '/studio/dashboard',
      '/talent/dashboard',
      '/admin/dashboard'
    ];
    
    for (const route of routes) {
      await accessProtectedRoute(route);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    rl.close();
  }
}

// Run the main function
main();