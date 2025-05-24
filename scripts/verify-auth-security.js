/**
 * Verify Authentication Security
 * 
 * This script verifies that all emergency auth functionality has been removed
 * and that the authentication system is properly secured.
 */

// Import required libraries
const fs = require('fs');
const path = require('path');

console.log('🔒 Verifying Authentication Security...');

// Files to check
const filesToCheck = [
  path.join(__dirname, '../src/auth.ts'),
  path.join(__dirname, '../src/middleware.ts'),
  path.join(__dirname, '../src/app/api/auth/auth-status/route.ts'),
  path.join(__dirname, '../env.example'),
  path.join(__dirname, '../src/app/sign-in/[[...sign-in]]/bypass-signin.tsx')
];

// Patterns that should not be present
const forbiddenPatterns = [
  'ENABLE_EMERGENCY_AUTH',
  'enableEmergencyAuth',
  'emergency auth',
  'bypass_auth',
  'admin_bypass'
];

// Check each file
let securityIssuesFound = false;

filesToCheck.forEach(filePath => {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    console.log(`Checking ${fileName}...`);
    
    let fileHasIssues = false;
    
    forbiddenPatterns.forEach(pattern => {
      if (content.includes(pattern)) {
        console.log(`  ❌ Found forbidden pattern in ${fileName}: "${pattern}"`);
        fileHasIssues = true;
        securityIssuesFound = true;
      }
    });
    
    if (!fileHasIssues) {
      console.log(`  ✅ ${fileName} is secure`);
    }
  } catch (error) {
    console.error(`Error checking ${filePath}:`, error);
  }
});

// Check for any auth bypass functionality in middleware
const middlewarePath = path.join(__dirname, '../src/middleware.ts');
try {
  const middlewareContent = fs.readFileSync(middlewarePath, 'utf8');
  
  // Verify that the middleware properly redirects on auth failure
  if (middlewareContent.includes('return NextResponse.next()') && 
      !middlewareContent.includes('token = null')) {
    console.log('  ⚠️  Middleware may have auth bypass behavior - check for "return NextResponse.next()" statements');
    securityIssuesFound = true;
  }
  
  // Check that token timeout errors redirect to sign-in
  if (middlewareContent.includes('timed out') && 
      !middlewareContent.includes('return NextResponse.redirect(signInUrl)')) {
    console.log('  ⚠️  Middleware does not properly redirect on token timeout');
    securityIssuesFound = true;
  }
} catch (error) {
  console.error('Error checking middleware:', error);
}

// Check auth.ts for emergency fallbacks
const authPath = path.join(__dirname, '../src/auth.ts');
try {
  const authContent = fs.readFileSync(authPath, 'utf8');
  
  // Verify that there are no emergency auth fallbacks
  if (authContent.includes('id: \'emergency-\'')) {
    console.log('  ⚠️  Auth.ts contains emergency user creation');
    securityIssuesFound = true;
  }
} catch (error) {
  console.error('Error checking auth.ts:', error);
}

// Final summary
if (securityIssuesFound) {
  console.log('\n❌ Security issues were found. Please fix them before deploying.');
} else {
  console.log('\n✅ Authentication system is secure. No emergency auth functionality found.');
}

// Check for bypass component
const bypassComponentPath = path.join(__dirname, '../src/app/sign-in/[[...sign-in]]/bypass-signin.tsx');
try {
  const bypassContent = fs.readFileSync(bypassComponentPath, 'utf8');
  
  if (bypassContent.includes('handleBypass') || 
      bypassContent.includes('document.cookie = `bypass_auth=true')) {
    console.log('  ⚠️  Bypass sign-in component still contains active code');
    securityIssuesFound = true;
  }
} catch (error) {
  console.error('Error checking bypass component:', error);
}

console.log('\nSecurity verification complete.');