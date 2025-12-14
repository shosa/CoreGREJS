'use client';

import PermissionGuard from '@/components/auth/PermissionGuard';

export default function TrackingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PermissionGuard requiredPermission="tracking">
      {children}
    </PermissionGuard>
  );
}
