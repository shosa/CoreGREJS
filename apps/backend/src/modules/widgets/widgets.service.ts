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

  async getProduzioneTrend(period: number = 7) {
    return this.cache.getOrSet(`widgets:produzione-trend:${period}`, 120, async () => {
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - period + 1);
      startDate.setHours(0, 0, 0, 0);

      const records = await this.prisma.productionRecord.findMany({
        where: { productionDate: { gte: startDate } },
        include: {
          valori: {
            include: {
              department: {
                include: { phase: { select: { nome: true } } },
              },
            },
          },
        },
        orderBy: { productionDate: 'asc' },
      });

      // Build day x phase matrix
      const phaseMap: Record<string, Record<string, number>> = {};
      const phaseSet = new Set<string>();

      for (const record of records) {
        const day = record.productionDate.toISOString().slice(0, 10);
        if (!phaseMap[day]) phaseMap[day] = {};
        for (const v of record.valori) {
          const phase = v.department.phase?.nome ?? v.department.nome;
          phaseSet.add(phase);
          phaseMap[day][phase] = (phaseMap[day][phase] || 0) + (v.valore || 0);
        }
      }

      // Fill all days in range
      const days: string[] = [];
      for (let i = 0; i < period; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        days.push(d.toISOString().slice(0, 10));
      }

      const phases = Array.from(phaseSet).sort();
      const data = days.map(day => {
        const entry: Record<string, any> = { day };
        let total = 0;
        for (const phase of phases) {
          const v = phaseMap[day]?.[phase] || 0;
          entry[phase] = v;
          total += v;
        }
        entry.totale = total;
        return entry;
      });

      return { phases, data };
    });
  }

  async getProduzioneTaglie(days: number = 30) {
    return this.cache.getOrSet(`widgets:produzione-taglie:${days}`, 120, async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      // Sum p01..p20 from riparazioni as proxy for size distribution
      const raw = await this.prisma.riparazione.findMany({
        where: { data: { gte: startDate } },
        select: {
          p01: true, p02: true, p03: true, p04: true, p05: true,
          p06: true, p07: true, p08: true, p09: true, p10: true,
          p11: true, p12: true, p13: true, p14: true, p15: true,
          p16: true, p17: true, p18: true, p19: true, p20: true,
          numerata: { select: { n01: true, n02: true, n03: true, n04: true, n05: true, n06: true, n07: true, n08: true, n09: true, n10: true, n11: true, n12: true, n13: true, n14: true, n15: true, n16: true, n17: true, n18: true, n19: true, n20: true } },
        },
      });

      // Aggregate by position (taglia slot)
      const totals: { slot: number; qty: number; taglia: string }[] = [];
      const slotQty = new Array(20).fill(0);
      for (const r of raw) {
        for (let i = 1; i <= 20; i++) {
          const key = `p${String(i).padStart(2, '0')}` as keyof typeof r;
          slotQty[i - 1] += (r[key] as number) || 0;
        }
      }

      // Map slot → taglia label using first available numerata
      const sampleNumerata = raw.find(r => r.numerata)?.numerata;
      for (let i = 0; i < 20; i++) {
        if (slotQty[i] > 0) {
          const nKey = `n${String(i + 1).padStart(2, '0')}` as any;
          const taglia = sampleNumerata?.[nKey] ?? `P${i + 1}`;
          totals.push({ slot: i + 1, qty: slotQty[i], taglia: String(taglia) });
        }
      }

      return { taglie: totals, totaleDays: days };
    });
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
