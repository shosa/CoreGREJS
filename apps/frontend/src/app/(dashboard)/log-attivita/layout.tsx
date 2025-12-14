'use client';

import PermissionGuard from '@/components/auth/PermissionGuard';

export default function LogAttivitaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PermissionGuard requiredPermission="log">
      {children}
    </PermissionGuard>
  );
}
