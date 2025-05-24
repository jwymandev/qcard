// Test authentication flow end-to-end
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fetch = require('node-fetch');

const prisma = new PrismaClient();
const TEST_EMAIL = 'test-auth-flow@example.com';
const TEST_PASSWORD = 'TestPassword123!';

async function main() {
  console.log('🔍 Testing authentication flow...');
  
  // 1. Clean up any existing test user
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: TEST_EMAIL }
    });
    
    if (existingUser) {
      console.log('Cleaning up existing test user...');
      await prisma.user.delete({
        where: { id: existingUser.id }
      });
    }
  } catch (error) {
    console.error('Error cleaning up test user:', error);
  }
  
  // 2. Test user registration
  console.log('\n📝 Testing registration...');
  try {
    const registerResponse = await fetch('http://localhost:3000/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        name: 'Test User',
        userType: 'talent'
      })
    });
    
    const registerData = await registerResponse.json();
    console.log('Registration response status:', registerResponse.status);
    console.log('Registration response data:', registerData);
    
    if (!registerResponse.ok) {
      throw new Error(`Registration failed: ${registerData.error || 'Unknown error'}`);
    }
    
    // Verify user was created in database
    const createdUser = await prisma.user.findUnique({
      where: { email: TEST_EMAIL }
    });
    
    if (!createdUser) {
      throw new Error('User not found in database after registration');
    }
    
    console.log('✅ User successfully created in database');
    console.log('User ID:', createdUser.id);
    console.log('User type:', createdUser.userType);
    
    // Check if password was hashed correctly
    const isPasswordHashed = createdUser.password.startsWith('$2a$') || createdUser.password.startsWith('$2b$');
    if (!isPasswordHashed) {
      throw new Error('Password does not appear to be hashed correctly');
    }
    console.log('✅ Password correctly hashed');
    
  } catch (error) {
    console.error('❌ Registration test failed:', error);
    process.exit(1);
  }
  
  // 3. Test authentication
  console.log('\n🔐 Testing authentication...');
  try {
    // Get CSRF token
    const csrfResponse = await fetch('http://localhost:3000/api/auth/csrf');
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.csrfToken;
    
    // Attempt login
    const loginResponse = await fetch('http://localhost:3000/api/auth/callback/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        csrfToken
      })
    });
    
    console.log('Login response status:', loginResponse.status);
    
    // Check if we got a redirect (which indicates successful auth)
    if (loginResponse.status !== 200 && !loginResponse.redirected) {
      throw new Error('Login failed - no redirect received');
    }
    
    console.log('✅ Authentication successful');
    
    // Extract cookies for session validation
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Session cookies set:', cookies ? 'Yes' : 'No');
    
  } catch (error) {
    console.error('❌ Authentication test failed:', error);
    process.exit(1);
  }
  
  console.log('\n🎉 Authentication flow test completed successfully!');
  await prisma.$disconnect();
}

main().catch(error => {
  console.error('Test failed:', error);
  prisma.$disconnect();
  process.exit(1);
});