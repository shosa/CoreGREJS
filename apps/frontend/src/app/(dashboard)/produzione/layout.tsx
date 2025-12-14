'use client';

import PermissionGuard from '@/components/auth/PermissionGuard';

export default function ProduzioneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PermissionGuard requiredPermission="produzione">
      {children}
    </PermissionGuard>
  );
}
