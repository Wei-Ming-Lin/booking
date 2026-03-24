'use client';

import { SessionProvider } from 'next-auth/react';
import ThemeProvider from './ThemeProvider';
import RoleSync from './RoleSync';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <RoleSync />
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
} 
