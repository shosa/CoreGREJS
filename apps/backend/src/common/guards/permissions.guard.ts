import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private prisma = new PrismaClient();

  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required permissions from decorator metadata
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions are required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new ForbiddenException('User not authenticated');
    }

    // Fetch user with permissions
    const userWithPermissions = await this.prisma.user.findUnique({
      where: { id: user.userId },
      include: { permissions: true },
    });

    if (!userWithPermissions) {
      throw new ForbiddenException('User not found');
    }

    // Admin users have all permissions
    if (userWithPermissions.adminType === 'admin') {
      return true;
    }

    // Check if user has required permissions
    const userPermissions =
      userWithPermissions.permissions?.permessi || {};

    // User needs at least ONE of the required permissions (OR logic)
    const hasPermission = requiredPermissions.some(
      (permission) => userPermissions[permission] === true,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Accesso negato. Permessi richiesti: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
