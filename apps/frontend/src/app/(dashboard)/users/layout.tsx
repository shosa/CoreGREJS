'use client';

import PermissionGuard from '@/components/auth/PermissionGuard';

export default function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PermissionGuard requiredPermission="users">
      {children}
    </PermissionGuard>
  );
}
