import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProduzioneService } from '../produzione/produzione.service';
import { CacheService } from '../../common/services/cache.service';

@Injectable()
export class WidgetsService {
  constructor(
    private prisma: PrismaService,
    private produzioneService: ProduzioneService,
    private cache: CacheService,
  ) {}

  async getUserWidgets(userId: number) {
    const widgets = await this.prisma.authWidgetConfig.findMany({
      where: { userId },
      orderBy: [{ y: 'asc' }, { x: 'asc' }],
    });

    // Map widgetId to id for frontend compatibility
    return widgets.map(w => ({
      id: w.widgetId,
      enabled: w.enabled,
      x: w.x,
      y: w.y,
      w: w.w,
      h: w.h,
    }));
  }

  async saveUserWidgets(userId: number, widgets: any[]) {
    // Delete existing widgets configuration
    await this.prisma.authWidgetConfig.deleteMany({
      where: { userId },
    });

    // Create new widget configurations
    if (widgets.length > 0) {
      await this.prisma.authWidgetConfig.createMany({
        data: widgets.map(w => ({
          userId,
          widgetId: w.id,
          enabled: w.enabled,
          x: w.x,
          y: w.y,
          w: w.w,
          h: w.h,
        })),
      });
    }

    return this.getUserWidgets(userId);
  }

  async getDashboardStats() {
    return this.cache.getOrSet('widgets:dashboard-stats', 60, () => this._computeDashboardStats());
  }

  private async _computeDashboardStats() {
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now);
    startOfMonth.setDate(now.getDate() - 30);

    const [
      riparazioniAperte,
      qualityRecordsToday,
      ddtBozze,
      scmLanciAttivi,
      produzioneOggi,
      exportOggi,
      exportSettimana,
      exportMese,
      qualityRecordsWithDefects,
      qualityRecordsByDept,
    ] = await Promise.all([
      this.prisma.riparazione.count({ where: { completa: false } }),
      this.prisma.qualityRecord.count({
        where: {
          dataControllo: {
            gte: startOfDay,
          },
        },
      }),
      this.prisma.exportDocument.count({ where: { stato: 'bozza' } }),
      this.prisma.scmLaunch.count({ where: { stato: 'in_corso' } }),
      this.produzioneService.getTodayStats(),
      this.prisma.exportDocument.count({
        where: {
          createdAt: { gte: startOfDay },
          stato: { not: 'bozza' },
        },
      }),
      this.prisma.exportDocument.count({
        where: {
          createdAt: { gte: startOfWeek },
          stato: { not: 'bozza' },
        },
      }),
      this.prisma.exportDocument.count({
        where: {
          createdAt: { gte: startOfMonth },
          stato: { not: 'bozza' },
        },
      }),
      this.prisma.qualityRecord.count({
        where: {
          dataControllo: { gte: startOfDay },
          haEccezioni: true,
        },
      }),
      this.prisma.qualityRecord.findMany({
        where: {
          dataControllo: { gte: startOfDay },
        },
        select: {
          reparto: true,
        },
      }),
    ]);

    // Count quality records by department
    const qualityByDept: Record<string, number> = {};
    qualityRecordsByDept.forEach(r => {
      if (r.reparto) {
        qualityByDept[r.reparto] = (qualityByDept[r.reparto] || 0) + 1;
      }
    });

    return {
      riparazioniAperte,
      riparazioniMie: 0,
      qualityRecordsToday,
      qualityRecordsWithDefects,
      qualityByDept,
      ddtBozze,
      scmLanciAttivi,
      produzioneOggi: produzioneOggi.total,
      produzioneOggiFasi: produzioneOggi.byPhase,
      exportOggi,
      exportSettimana,
      exportMese,
    };
  }

  async getProduzioneChartData(period: number = 7) {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - period);

    // Get all production values for the period
    const productionValues = await this.prisma.productionValue.findMany({
      where: {
        record: {
          productionDate: { gte: startDate },
        },
      },
      include: {
        department: {
          select: { nome: true },
        },
      },
    });

    // Aggregate by department
    const departmentMap: Record<string, number> = {};
    productionValues.forEach((pv) => {
      const deptName = pv.department.nome;
      const value = pv.valore || 0;
      departmentMap[deptName] = (departmentMap[deptName] || 0) + value;
    });

    // Convert to array and sort by value descending
    const departments = Object.entries(departmentMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { departments };
  }

  async getRecentActivities(userId: number, permissions: string[] | undefined, limit = 10) {
    // Check if user has 'log' permission to see all activities
    // If permissions is undefined or empty, check in database
    let hasLogPermission = false;

    if (permissions && permissions.length > 0) {
      hasLogPermission = permissions.includes('log');
    } else {
      // Fetch user permissions from database
      const userWithPermissions = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          permissions: true,
        },
      });

      // Check if 'log' permission exists in the JSON permessi field
      if (userWithPermissions?.permissions?.permessi) {
        const permessi = userWithPermissions.permissions.permessi;

        // Handle different possible formats of permessi (array or object)
        if (Array.isArray(permessi)) {
          hasLogPermission = permessi.includes('log');
        } else if (typeof permessi === 'object' && permessi !== null) {
          // If it's an object, check if 'log' key exists and is true
          hasLogPermission = permessi['log'] === true;
        }
      }
    }

    return this.prisma.activityLog.findMany({
      where: hasLogPermission ? {} : { userId }, // Show all if has permission, otherwise only user's activities
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { nome: true, userName: true },
        },
      },
    });
  }
}
