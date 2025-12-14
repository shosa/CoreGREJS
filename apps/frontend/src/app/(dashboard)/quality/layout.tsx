'use client';

import PermissionGuard from '@/components/auth/PermissionGuard';

export default function QualityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PermissionGuard requiredPermission="quality">
      {children}
    </PermissionGuard>
  );
}
