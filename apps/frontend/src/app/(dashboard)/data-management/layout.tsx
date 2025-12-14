'use client';

import PermissionGuard from '@/components/auth/PermissionGuard';

export default function DataManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PermissionGuard requiredPermission="dbsql">
      {children}
    </PermissionGuard>
  );
}
