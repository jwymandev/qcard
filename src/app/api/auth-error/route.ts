import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const error = searchParams.get("error");

  console.log("Auth error:", error);

  return NextResponse.json({ 
    error: error || "Unknown auth error",
    message: "An authentication error occurred. This page helps with debugging.",
    docs: "See https://errors.authjs.dev for more information."
  });
}