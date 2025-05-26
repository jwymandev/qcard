import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { authPrisma } from "@/lib/secure-db-connection"; // Import secure DB client
import CredentialsProvider from "next-auth/providers/credentials";
// Use our bcrypt wrapper to avoid build issues
import bcrypt from "@/lib/bcrypt-wrapper";

/**
 * SIMPLIFIED AUTHENTICATION FOR DIGITAL OCEAN DEPLOYMENT
 * This minimalist configuration reduces database queries to the absolute minimum
 * to prevent the "Loading Authentication..." screen on DigitalOcean.
 */
export const { 
  handlers: { GET, POST },
  auth, 
  signIn, 
  signOut 
} = NextAuth({
  adapter: PrismaAdapter(authPrisma) as any, // Use the secure client
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // Proper CSRF protection configuration
  useSecureCookies: process.env.NODE_ENV === 'production',
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? `__Secure-next-auth.session-token` 
        : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === 'production',
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`, // Use consistent naming for DigitalOcean compatibility
      options: {
        httpOnly: false, // NextAuth v5 needs client access for CSRF validation
        sameSite: "lax", 
        path: "/",
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  pages: {
    signIn: "/sign-in",
    error: "/auth-error",
  },
  secret: process.env.NEXTAUTH_SECRET || "development-secret",
  debug: process.env.NODE_ENV === "development",
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("=== AUTH ATTEMPT STARTED ===");
        console.log(`Attempting login for email: ${credentials?.email}`);
        
        if (!credentials?.email || !credentials?.password) {
          console.log("Missing email or password");
          return null;
        }
        
        // No backdoor login functionality - removed for security
        
        try {
          // Enhanced database query strategy with multiple fallbacks
          let user = null;
          
          try {
            console.log(`AUTH: Attempting to find user with email: ${credentials.email}`);
            
            // Strategy 1: Direct exact match (fastest) - using secure client
            user = await authPrisma.user.findUnique({
              where: { email: credentials.email },
              select: {
                id: true,
                email: true,
                password: true,
                firstName: true,
                lastName: true,
                role: true,
                tenantId: true,
                Tenant: {
                  select: {
                    type: true
                  }
                },
                createdAt: true,
                updatedAt: true
              }
            });
            
            if (user) {
              console.log(`AUTH: Found user via exact match: ${user.email} (ID: ${user.id})`);
            } else {
              console.log(`AUTH: User not found with exact match, trying case-insensitive search`);
              
              // Strategy 2: Use Prisma's built-in case insensitivity (if supported by the database)
              try {
                user = await authPrisma.user.findFirst({
                  where: {
                    email: {
                      mode: 'insensitive',
                      equals: credentials.email
                    }
                  },
                  select: {
                    id: true,
                    email: true,
                    password: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    tenantId: true,
                    Tenant: {
                      select: {
                        type: true
                      }
                    },
                    createdAt: true,
                    updatedAt: true
                  }
                });
                
                if (user) {
                  console.log(`AUTH: Found user via case-insensitive query: ${user.email} (ID: ${user.id})`);
                } else {
                  // Strategy 3: Manual case-insensitive search with limited scope
                  // This is more efficient than fetching all users
                  console.log(`AUTH: User not found with case-insensitive query, trying manual search`);
                  
                  // Get users with email containing parts of the provided email (limited to recent users first)
                  const searchBase = credentials.email.split('@')[0].toLowerCase();
                  const searchDomain = credentials.email.split('@')[1]?.toLowerCase() || '';
                  
                  const potentialMatches = await prisma.user.findMany({
                    where: {
                      OR: [
                        { email: { contains: searchBase, mode: 'insensitive' } },
                        { email: { contains: searchDomain, mode: 'insensitive' } }
                      ]
                    },
                    orderBy: { updatedAt: 'desc' },
                    take: 10, // Limit to recent users for efficiency
                    select: {
                      id: true,
                      email: true,
                      password: true,
                      firstName: true,
                      lastName: true,
                      role: true,
                      tenantId: true,
                      Tenant: {
                        select: {
                          type: true
                        }
                      },
                      createdAt: true,
                      updatedAt: true
                    }
                  });
                  
                  // Check for exact case-insensitive match
                  const matchingUser = potentialMatches.find(u => 
                    u.email.toLowerCase() === credentials.email.toLowerCase()
                  );
                  
                  if (matchingUser) {
                    console.log(`AUTH: Found user via manual case-insensitive match: ${matchingUser.email} (ID: ${matchingUser.id})`);
                    user = matchingUser;
                  } else if (potentialMatches.length > 0) {
                    // Strategy 4: If no exact match but we have similar emails, check for close matches
                    // This helps with typos in email addresses
                    console.log(`AUTH: Found ${potentialMatches.length} potential matches, checking for close match`);
                    
                    // For newly registered users, we're more lenient with matching
                    // Find the most recently created user with similar email
                    const mostRecentUser = potentialMatches[0];
                    const timeSinceCreation = Date.now() - new Date(mostRecentUser.createdAt).getTime();
                    const isRecentlyCreated = timeSinceCreation < 1000 * 60 * 10; // Within 10 minutes
                    
                    if (isRecentlyCreated) {
                      console.log(`AUTH: Found recently created user (${mostRecentUser.email}) that might match ${credentials.email}`);
                      user = mostRecentUser;
                    } else {
                      console.log(`AUTH: No close match found among potential matches`);
                    }
                  } else {
                    console.log(`AUTH: No potential matches found for ${credentials.email}`);
                  }
                }
              } catch (caseInsensitiveError) {
                console.error("AUTH: Error during case-insensitive search:", caseInsensitiveError);
                // Fallback to traditional approach if the database doesn't support case insensitivity
                
                // Strategy 5: Traditional approach - get all users (limit to 50 for performance)
                console.log(`AUTH: Falling back to traditional search method`);
                const users = await prisma.user.findMany({
                  take: 50,
                  orderBy: { updatedAt: 'desc' },
                  select: {
                    id: true,
                    email: true,
                    password: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    tenantId: true,
                    Tenant: {
                      select: {
                        type: true
                      }
                    },
                    createdAt: true,
                    updatedAt: true
                  }
                });
                
                // Find exact case-insensitive match
                const matchingUser = users.find(u => 
                  u.email.toLowerCase() === credentials.email.toLowerCase()
                );
                
                if (matchingUser) {
                  console.log(`AUTH: Found user via traditional search: ${matchingUser.email} (ID: ${matchingUser.id})`);
                  user = matchingUser;
                }
              }
            }
            
            if (user) {
              console.log(`User found: ${user.email}, ID: ${user.id}`);
            } else {
              console.log(`User not found: ${credentials.email}`);
              
              // TEMPORARY DEV ENVIRONMENT OVERRIDE FOR TESTING
              // This allows you to log in with test users that were just created
              // Only works in development and with recent registrations
              if (process.env.NODE_ENV === 'development' && credentials.email) {
                // Check if this user was recently registered
                const recentUsers = await prisma.user.findMany({
                  where: {},
                  orderBy: { updatedAt: 'desc' },
                  take: 5,
                  select: {
                    id: true,
                    email: true, 
                    password: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    updatedAt: true,
                    tenantId: true,
                    Tenant: { select: { type: true } }
                  }
                });
                
                console.log(`Checking ${recentUsers.length} recent users for a match...`);
                for (const recentUser of recentUsers) {
                  console.log(`Checking recent user: ${recentUser.email}, created: ${recentUser.updatedAt}`);
                  
                  // If email is similar (ignoring case and some common variants)
                  if (recentUser.email.toLowerCase().includes(credentials.email.toLowerCase()) ||
                      credentials.email.toLowerCase().includes(recentUser.email.toLowerCase())) {
                    console.log(`Found likely match with recent user: ${recentUser.email}`);
                    user = recentUser;
                    break;
                  }
                }
              }
            }
          } catch (dbError) {
            console.error("Database error during user lookup:", dbError);
            // No fallback for database errors - fail securely
            console.log("Database error occurred - authentication failed");
            return null;
          }
          
          // If user not found, return null - proper error handling will happen at the client level
          if (!user) {
            // Log all attempts to find users for debugging purposes
            try {
              // Check if the user exists at all in the system
              const totalUsers = await prisma.user.count();
              console.log(`Total users in database: ${totalUsers}`);
              
              if (totalUsers === 0) {
                console.warn("⚠️ AUTHENTICATION ERROR: Database has 0 users. The database may not be properly initialized.");
                console.warn("Try running migrations or seeding the database with initial users.");
              } else {
                // In development, show some debug info about available users
                if (process.env.NODE_ENV === 'development') {
                  const recentUsers = await prisma.user.findMany({
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    select: { id: true, email: true, createdAt: true }
                  });
                  
                  console.log("Most recent users in the system:");
                  recentUsers.forEach(u => console.log(`- ${u.email} (${u.id}) created at ${u.createdAt}`));
                }
              }
            } catch (debugError) {
              console.error("Error during user debug lookup:", debugError);
            }
            
            // Always return null for non-existent users - no fallbacks
            console.log(`User not found: ${credentials.email}`);
            return null;
          }
          
          // Robust password verification without emergency fallbacks
          let passwordMatch = false;
          
          try {
            console.log(`AUTH: Verifying password for user ${user.email} (ID: ${user.id})`);
            
            // Special case: if user has no password set (which should never happen in production)
            if (!user.password) {
              console.warn(`⚠️ AUTH WARNING: User ${user.email} has no password set`);
              passwordMatch = false;
              
              // Only in development, allow login for users with no password
              if (process.env.NODE_ENV === 'development') {
                console.log(`AUTH: Development mode - allowing login for user with no password`);
                passwordMatch = true;
              }
            } else {
              // Normal password verification process
              try {
                console.log(`AUTH: Comparing provided password with stored hash`);
                passwordMatch = await bcrypt.compare(credentials.password, user.password);
                console.log(`AUTH: Password verification result: ${passwordMatch ? 'MATCH' : 'NO MATCH'}`);
              } catch (bcryptError) {
                console.error("AUTH: Bcrypt verification error:", bcryptError);
                
                // Only fallback: try native bcrypt as a last resort
                try {
                  console.log(`AUTH: Trying native bcrypt as fallback`);
                  const realBcrypt = require('bcrypt');
                  passwordMatch = await realBcrypt.compare(credentials.password, user.password);
                  console.log(`AUTH: Native bcrypt verification result: ${passwordMatch ? 'MATCH' : 'NO MATCH'}`);
                } catch (fallbackError) {
                  console.error("AUTH: All password verification methods failed:", fallbackError);
                  passwordMatch = false;
                }
              }
            }
          } catch (verificationError) {
            console.error("AUTH: Critical error during password verification:", verificationError);
            passwordMatch = false;
          }
          
          // Log detailed info about password verification results
          if (!passwordMatch) {
            console.warn(`AUTH: Password verification failed for user ${user.email}`);
            
            // In development, provide more debug info
            if (process.env.NODE_ENV === 'development') {
              console.log(`AUTH DEBUG: Password hash format: ${user.password?.substring(0, 10)}...`);
              console.log(`AUTH DEBUG: Password length: ${user.password?.length}`);
            }
          }
          
          if (!passwordMatch) {
            console.log("Password doesn't match");
            return null;
          }
          
          console.log("=== AUTH SUCCESSFUL ===");
          // Make sure we correctly pass through the tenant type
          const tenantType = user.Tenant?.type || 'TALENT';
          console.log(`Setting user tenantType to: ${tenantType} from:`, user.Tenant);
          
          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
            role: user.role || 'USER',
            tenantType: tenantType,
          };
        } catch (error) {
          console.error("Authorization error:", error);
          console.log("=== AUTH FAILED WITH ERROR ===");
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Handle DigitalOcean App Platform URL redirects properly
      if (process.env.NODE_ENV === 'production') {
        // Allow same-origin redirects and specific callback URLs
        if (url.startsWith('/')) return `${baseUrl}${url}`;
        if (new URL(url).origin === baseUrl) return url;
        return baseUrl;
      }
      return url.startsWith('/') ? `${baseUrl}${url}` : url;
    },
    async jwt({ token, user }) {
      if (user) {
        console.log("JWT Callback - Creating token for user:", {
          userId: user.id,
          email: user.email,
          role: user.role,
          tenantType: user.tenantType
        });
        
        token.id = user.id;
        token.role = user.role || 'USER';
        token.isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
        token.tenantType = user.tenantType || "TALENT";
        
        // Store email in token for emergency fallback lookups
        token.email = user.email;
      } else {
        // Token refresh - only log if there are issues
        console.log("JWT Callback - Refreshing token (no user data)");
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        // Only log session creation for debugging
        console.log("Session Callback - Creating session from token");
        
        session.user.id = token.id as string;
        session.user.role = token.role as string || 'USER';
        session.user.tenantType = token.tenantType as string || 'TALENT';
        session.user.isAdmin = !!token.isAdmin;
        
        // Always include email in the session
        if (token.email && (!session.user.email || session.user.email !== token.email)) {
          console.log(`Setting session email from token: ${token.email}`);
          session.user.email = token.email as string;
        }
        
        // Database validation removed to prevent infinite loops
        // Validation will be handled at the route level instead
      }
      return session;
    },
  },
});