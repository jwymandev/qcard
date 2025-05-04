import { User } from "next-auth";
import { JWT } from "next-auth/jwt";

// Define admin roles
export type UserRole = "USER" | "ADMIN" | "SUPER_ADMIN";

declare module "next-auth" {
  interface Session {
    user: User & {
      id: string;
      role: UserRole;
      tenantType?: string;
      isAdmin?: boolean; // For quick admin checks
    };
  }

  interface User {
    id: string;
    role: UserRole;
    tenantType?: string;
    isAdmin?: boolean; // For quick admin checks
    avatar?: string | null;
    image?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    tenantType?: string;
    isAdmin?: boolean; // For quick admin checks
  }
}