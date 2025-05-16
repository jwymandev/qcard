import { NextResponse } from "next/server";
import { headers } from "next/headers";

/**
 * API route for debugging SSL/HTTPS connection issues
 * Can be called from client or server to verify security settings
 */
export async function GET() {
  const headersList = headers();
  
  // Collect important headers for debugging
  const protocol = headersList.get("x-forwarded-proto") || "unknown";
  const host = headersList.get("host") || "unknown";
  const userAgent = headersList.get("user-agent") || "unknown";
  const forwardedFor = headersList.get("x-forwarded-for") || "unknown";
  const forwardedHost = headersList.get("x-forwarded-host") || "unknown";
  const referrer = headersList.get("referer") || "none";
  
  // Check if request is using HTTPS
  const isSecure = protocol === "https";
  
  // Get environment variables related to security
  const nodeEnv = process.env.NODE_ENV || "development";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "not set";
  const authUrl = process.env.NEXTAUTH_URL || "not set";
  const trustHost = process.env.NEXTAUTH_URL_INTERNAL ? true : false;
  
  // Debug information
  const debugInfo = {
    request: {
      protocol,
      host,
      isSecure,
      userAgent,
      forwardedFor,
      forwardedHost,
      referrer,
    },
    environment: {
      nodeEnv,
      appUrl,
      authUrl,
      trustHost,
    },
    server: {
      timestamp: new Date().toISOString(),
      processId: process.pid,
    }
  };
  
  // Log the debug info server-side
  console.log("SSL Debug Information:", JSON.stringify(debugInfo, null, 2));
  
  return NextResponse.json({ 
    success: true, 
    message: "SSL debug information collected",
    isSecure,
    data: debugInfo 
  });
}