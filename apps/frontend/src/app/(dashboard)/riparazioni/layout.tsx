'use client';

import PermissionGuard from '@/components/auth/PermissionGuard';

export default function RiparazioniLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PermissionGuard requiredPermission="riparazioni">
      {children}
    </PermissionGuard>
  );
}
