'use client';

import PermissionGuard from '@/components/auth/PermissionGuard';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PermissionGuard requiredPermission="settings">
      {children}
    </PermissionGuard>
  );
}
