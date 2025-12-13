import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface LogActivityParams {
  userId?: number;
  module: string;
  action: string;
  entity?: string;
  entityId?: string | number;
  description?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log an activity
   */
  async log(params: LogActivityParams): Promise<void> {
    try {
      await this.prisma.activityLog.create({
        data: {
          userId: params.userId || null,
          module: params.module,
          action: params.action,
          entity: params.entity || null,
          entityId: params.entityId ? String(params.entityId) : null,
          description: params.description || null,
          metadata: params.metadata || null,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log activity: ${error.message}`, error.stack);
      // Non sollevare eccezione per non bloccare il flusso principale
    }
  }

  /**
   * Get activity logs with filters
   */
  async getLogs(filters: {
    userId?: number;
    module?: string;
    action?: string;
    entity?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.module) where.module = filters.module;
    if (filters.action) where.action = filters.action;
    if (filters.entity) where.entity = filters.entity;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              userName: true,
              nome: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return {
      logs,
      total,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    };
  }

  /**
   * Get activity statistics
   */
  async getStats(filters?: {
    userId?: number;
    module?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};

    if (filters?.userId) where.userId = filters.userId;
    if (filters?.module) where.module = filters.module;

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    // Get counts by module
    const byModule = await this.prisma.activityLog.groupBy({
      by: ['module'],
      where,
      _count: true,
      orderBy: {
        _count: {
          module: 'desc',
        },
      },
    });

    // Get counts by action
    const byAction = await this.prisma.activityLog.groupBy({
      by: ['action'],
      where,
      _count: true,
      orderBy: {
        _count: {
          action: 'desc',
        },
      },
    });

    // Get total count
    const total = await this.prisma.activityLog.count({ where });

    return {
      total,
      byModule: byModule.map((item) => ({
        module: item.module,
        count: item._count,
      })),
      byAction: byAction.map((item) => ({
        action: item.action,
        count: item._count,
      })),
    };
  }

  /**
   * Get available filter values (distinct modules and actions)
   */
  async getAvailableFilters() {
    const [modules, actions] = await Promise.all([
      this.prisma.activityLog.findMany({
        distinct: ['module'],
        select: {
          module: true,
        },
        orderBy: {
          module: 'asc',
        },
      }),
      this.prisma.activityLog.findMany({
        distinct: ['action'],
        select: {
          action: true,
        },
        orderBy: {
          action: 'asc',
        },
      }),
    ]);

    return {
      modules: modules.map((m) => m.module),
      actions: actions.map((a) => a.action),
    };
  }

  /**
   * Delete old logs (cleanup)
   */
  async cleanup(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.activityLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(`Cleaned up ${result.count} activity logs older than ${olderThanDays} days`);
    return result.count;
  }
}
