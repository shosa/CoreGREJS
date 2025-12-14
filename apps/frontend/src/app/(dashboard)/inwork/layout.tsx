'use client';

import PermissionGuard from '@/components/auth/PermissionGuard';

export default function InWorkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PermissionGuard requiredPermission="inwork">
      {children}
    </PermissionGuard>
  );
}
