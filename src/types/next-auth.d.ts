import { User } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: User & {
      id: string;
      role: string;
      tenantType?: string;
    };
  }

  interface User {
    id: string;
    role: string;
    tenantType?: string;
    avatar?: string | null;
    image?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    tenantType?: string;
  }
}