// Add this file to force logout and clear invalid sessions

export async function GET(request) {
  const response = new Response(
    JSON.stringify({
      message: "Successfully logged out",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );

  // Clear the session cookie
  response.headers.append(
    "Set-Cookie",
    "next-auth.session-token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
  );
  
  // Clear the callback URL cookie
  response.headers.append(
    "Set-Cookie",
    "next-auth.callback-url=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
  );
  
  // Clear the CSRF token cookie
  response.headers.append(
    "Set-Cookie",
    "next-auth.csrf-token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
  );

  return response;
}