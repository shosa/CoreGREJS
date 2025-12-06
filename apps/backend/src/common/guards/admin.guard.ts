import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class AdminGuard implements CanActivate {
  private prisma = new PrismaClient();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new ForbiddenException('User not authenticated');
    }

    // Fetch user from database
    const userRecord = await this.prisma.user.findUnique({
      where: { id: user.userId },
    });

    if (!userRecord) {
      throw new ForbiddenException('User not found');
    }

    // Only admin users can access
    if (userRecord.userType !== 'admin') {
      throw new ForbiddenException('Accesso riservato agli amministratori');
    }

    return true;
  }
}
