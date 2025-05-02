import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  /**
   * Extending the built-in session types
   */
  interface Session {
    user: {
      id: string
      role: string
      tenantType?: string
    } & DefaultSession["user"]
  }
}