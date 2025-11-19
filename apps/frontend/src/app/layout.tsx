'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth';
import Notifications from '@/components/ui/Notifications';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());
  const { darkMode } = useAuthStore();

  return (
    <html lang="it" className={`h-full ${darkMode ? 'dark' : ''}`}>
      <head>
        <title>CoreGRE</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" type="image/x-icon" href="/assets/favicon.ico" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
      </head>
      <body className={`h-full ${darkMode ? 'dark bg-gray-900' : ''}`}>
        <QueryClientProvider client={queryClient}>
          {children}
          <Notifications />
        </QueryClientProvider>
      </body>
    </html>
  );
}
