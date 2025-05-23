import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
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
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
        domain: undefined, // Don't set domain to avoid issues
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: "lax",
        path: "/",
        secure: true,
        domain: undefined,
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
        domain: undefined,
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
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        
        try {
          // Only make the absolutely essential database query
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            select: {
              id: true,
              email: true,
              password: true,
              firstName: true,
              lastName: true,
              role: true,
            }
          });
          
          if (!user || !user.password) {
            return null;
          }
          
          const passwordMatch = await bcrypt.compare(
            credentials.password, 
            user.password
          );
          
          if (!passwordMatch) {
            return null;
          }
          
          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
            role: user.role || 'USER',
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
        token.role = user.role || 'USER';
        token.isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
        
        // Set a default tenant type without any additional database queries
        token.tenantType = "TALENT";
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string || 'USER';
        session.user.tenantType = token.tenantType as string || 'TALENT';
        session.user.isAdmin = !!token.isAdmin;
      }
      return session;
    },
  },
});