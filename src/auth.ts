import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { z } from "zod";
// Create a UserRole type without importing it
type UserRole = "USER" | "ADMIN" | "SUPER_ADMIN";

// Make sure URLs always have protocol
function ensureAbsoluteUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `https://${url}`;
}

// Define validation schema for credentials - but make it more lenient with error messages
const credentialsSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

export const { 
  handlers: { GET, POST },
  auth, 
  signIn, 
  signOut 
} = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`, // Same name regardless of environment for consistency
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false, // Allow non-HTTPS for development
        domain: undefined, // Don't set domain to avoid issues
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`, // Same name regardless of environment
      options: {
        sameSite: "lax",
        path: "/",
        secure: false,
        domain: undefined, // Don't set domain to avoid issues
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`, // Same name regardless of environment
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false,
        domain: undefined, // Don't set domain to avoid issues
      },
    },
  },
  pages: {
    signIn: "/sign-in",
    error: "/auth-error",
  },
  // This is critical for development testing
  secret: process.env.NEXTAUTH_SECRET || "development-secret",
  debug: process.env.NODE_ENV !== "production",
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials) {
          console.error("No credentials provided");
          return null;
        }
        
        console.log("Authorize attempt with:", { 
          email: credentials.email,
          passwordLength: typeof credentials.password === 'string' ? credentials.password.length : 0
        });
        
        try {
          const { email, password } = credentials;
          
          // Simple validation
          if (!email || !password) {
            console.error("Email or password missing");
            return null;
          }

          // Find user with a simple query
          console.log(`Finding user with email: ${email}`);
          const user = await prisma.user.findUnique({
            where: { email: email as string },
            select: {
              id: true,
              email: true,
              password: true,
              firstName: true,
              lastName: true,
              role: true,
              tenantId: true,
            }
          });

          // Check if user exists
          if (!user) {
            console.error("User not found:", email);
            return null;
          }
          
          // Check if user has password
          if (!user.password) {
            console.error("User has no password set:", email);
            return null;
          }
          
          console.log("User found, checking password...");
          
          // Check password
          const passwordMatch = await bcrypt.compare(
            password as string, 
            user.password as string
          );
          if (!passwordMatch) {
            console.error("Password does not match for user:", email);
            return null;
          }
          
          console.log("Password matched for user:", email);

          // Return basic user info
          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
            role: user.role,
          };
        } catch (error) {
          console.error("Authorization error:", error);
          if (error instanceof Error) {
            console.error(error.message);
            console.error(error.stack);
          }
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Set basic user fields from the user object
        token.id = user.id;
        token.role = user.role;
        
        // Check if user is an admin
        token.isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
        
        try {
          // For simplicity during debugging, we'll set a default tenant type
          // This assumes your app has a user model with tenant information
          console.log("Setting tenant type for user:", user.id);
          
          // DEFAULT to TALENT for now to keep things simple
          // This can be changed later once the basic auth is working
          token.tenantType = "TALENT";
          
          // Get actual tenant info if possible - in a safer way
          if (user.id) {
            try {
              // First get the tenantId with a direct query
              const userData = await prisma.user.findUnique({
                where: { id: user.id },
                include: { 
                  Tenant: {
                    select: { type: true }
                  }
                }
              });
              
              // If user has a tenant with a type, use that
              if (userData?.Tenant?.type) {
                token.tenantType = userData.Tenant.type;
                console.log("Found tenant type:", userData.Tenant.type);
              }
            } catch (tenantError) {
              console.error("Error getting tenant directly:", tenantError);
              // Continue with default TALENT type
            }
          }
        } catch (error) {
          console.error("Error in JWT callback:", error);
          if (error instanceof Error) {
            console.error(error.message);
            console.error(error.stack);
          }
          // Default to TALENT as a fallback
          token.tenantType = "TALENT";
        }
      }
      return token;
    },
    async session({ session, token }) {
      try {
        if (token && session.user) {
          session.user.id = token.id as string;
          
          // Set defaults if token values are missing
          session.user.role = token.role || 'USER';
          session.user.tenantType = token.tenantType || 'TALENT';
          
          // Set admin flag
          session.user.isAdmin = !!token.isAdmin;
          
          console.log("Session created for user:", {
            id: session.user.id,
            role: session.user.role,
            tenantType: session.user.tenantType,
            isAdmin: session.user.isAdmin
          });
        }
      } catch (error) {
        console.error("Error creating session:", error);
      }
      return session;
    },
  },
});