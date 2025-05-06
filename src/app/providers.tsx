'use client';

import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider 
      // Force the session to be refreshed on window focus to maintain sync
      refetchInterval={0} 
      refetchOnWindowFocus={true}
    >
      {children}
    </SessionProvider>
  );
}