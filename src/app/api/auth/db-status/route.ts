import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * API endpoint to check database connectivity
 * Used for diagnosing connection issues that might affect authentication
 */
export async function GET() {
  try {
    console.log("Database status check requested");
    
    // Simple query to test database connection
    const startTime = Date.now();
    const testQuery = await prisma.$queryRaw`SELECT 1 as dbTest`;
    const queryTime = Date.now() - startTime;
    
    console.log(`Database test query completed in ${queryTime}ms`);
    
    // Count users to check data access
    const userCount = await prisma.user.count();
    
    // Get database information
    const dbInfo = await prisma.$queryRaw`SELECT version() as version, current_database() as database`;
    
    return NextResponse.json({
      status: "connected",
      queryTime: `${queryTime}ms`,
      userCount,
      databaseInfo: dbInfo
    });
  } catch (error) {
    console.error("Database connection error:", error);
    
    return NextResponse.json({
      status: "error",
      error: error instanceof Error ? error.message : String(error),
      type: error instanceof Error ? error.name : "Unknown",
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}