'use client';

import PermissionGuard from '@/components/auth/PermissionGuard';

export default function ExportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PermissionGuard requiredPermission="export">
      {children}
    </PermissionGuard>
  );
}
