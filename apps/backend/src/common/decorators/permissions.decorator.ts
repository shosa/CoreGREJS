import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to specify required permissions for a route
 * Usage: @RequirePermissions('riparazioni', 'produzione')
 */
export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
