import { GET, POST } from "@/auth";
import { dynamicConfig } from "@/app/config";

// Force dynamic rendering for auth routes
export const dynamic = 'force-dynamic';

export { GET, POST };