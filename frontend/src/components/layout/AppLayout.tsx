import React from 'react';
import { Header } from './Header';

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Main application layout with full width and minimal spacing
 */
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="px-2 py-2 sm:px-4 sm:py-3">{children}</main>
    </div>
  );
}
