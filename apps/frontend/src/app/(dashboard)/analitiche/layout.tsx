'use client';

import PermissionGuard from '@/components/auth/PermissionGuard';

export default function AnaliticheLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PermissionGuard requiredPermission="analitiche">
      {children}
    </PermissionGuard>
  );
}
