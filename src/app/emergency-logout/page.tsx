"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function EmergencyLogout() {
  const [message, setMessage] = useState("Clearing authentication session...");
  const router = useRouter();

  useEffect(() => {
    async function clearSession() {
      try {
        // First, try the API route
        const response = await fetch("/api/auth/signout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ callbackUrl: "/sign-in" }),
        });

        // Also try our emergency logout
        await fetch("/sign-in/emergency-logout");

        // Clear local storage
        localStorage.clear();
        
        // Clear all cookies
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
        });

        setMessage("Session cleared! Redirecting to login page...");
        
        // Redirect after a short delay
        setTimeout(() => {
          router.push("/sign-in");
        }, 2000);
      } catch (error) {
        setMessage("Error clearing session. Please try clearing browser cookies manually.");
        console.error("Logout error:", error);
      }
    }

    clearSession();
  }, [router]);

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column",
      alignItems: "center", 
      justifyContent: "center", 
      minHeight: "100vh",
      padding: "20px",
      textAlign: "center"
    }}>
      <h1>Emergency Logout</h1>
      <p>{message}</p>
      <div style={{ marginTop: "20px" }}>
        <p>If you're still seeing the loading screen after being redirected, try these steps:</p>
        <ol style={{ textAlign: "left" }}>
          <li>Clear your browser cookies for this site</li>
          <li>Try using a different browser</li>
          <li>Close all browser tabs and reopen the application</li>
        </ol>
      </div>
      <button 
        onClick={() => router.push("/sign-in")}
        style={{
          marginTop: "20px",
          padding: "10px 20px",
          backgroundColor: "#4285f4",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer"
        }}
      >
        Go to Sign In
      </button>
    </div>
  );
}