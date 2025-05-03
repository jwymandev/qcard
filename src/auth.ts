import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { z } from "zod";

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
  },
  pages: {
    signIn: "/sign-in",
    // signUp is not a valid option, remove it
    error: "/auth-error",
  },
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
          // Validate credentials
          const result = credentialsSchema.safeParse(credentials);
          if (!result.success) {
            console.error("Validation failed:", result.error.format());
            return null;
          }

          const { email, password } = result.data;

          // Find user
          const user = await prisma.user.findUnique({
            where: { email },
          });

          // Check if user exists and has password
          if (!user) {
            console.error("User not found:", email);
            return null;
          }
          
          if (!user.password) {
            console.error("User has no password set:", email);
            return null;
          }
          
          console.log("User found, checking password...");
          
          // Check password - with better error handling
          try {
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
              console.error("Password does not match for user:", email);
              return null;
            }
            
            console.log("Password matched for user:", email);
          } catch (bcryptError) {
            console.error("Bcrypt error:", bcryptError);
            // Try a direct string comparison as fallback (for development/testing only)
            if (process.env.NODE_ENV === 'development' && password === user.password) {
              console.log("DEV MODE: Direct password match");
            } else {
              return null;
            }
          }

          // Return user info
          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
            role: user.role,
          };
        } catch (error) {
          console.error("Authorization error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        
        try {
          // Get tenant type for role-based routing
          // Using a different approach to avoid schema issues
          console.log("Getting tenant info for user:", user.id);
          
          // First get the tenantId
          const userData = await prisma.user.findUnique({
            where: { id: user.id },
            select: { tenantId: true }
          });
          
          if (userData?.tenantId) {
            // Then fetch the tenant separately
            const tenantData = await prisma.tenant.findUnique({
              where: { id: userData.tenantId },
              select: { type: true }
            });
            
            if (tenantData) {
              token.tenantType = tenantData.type;
              console.log("Found tenant type:", tenantData.type);
            }
          }
        } catch (error) {
          console.error("Error getting tenant info:", error);
          // Default to TALENT if we can't determine
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
          session.user.role = (token.role as string) || 'USER';
          session.user.tenantType = (token.tenantType as string) || 'TALENT';
          
          console.log("Session created for user:", {
            id: session.user.id,
            role: session.user.role,
            tenantType: session.user.tenantType
          });
        }
      } catch (error) {
        console.error("Error creating session:", error);
      }
      return session;
    },
  },
});