import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ProduzioneService {
  constructor(private prisma: PrismaService) {}

  // Get calendar data for a month
  async getCalendarData(month: number, year: number) {
    // Use UTC dates to avoid timezone issues
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0));

    const records = await this.prisma.productionRecord.findMany({
      where: {
        productionDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        productionDate: true,
        totalMontaggio: true,
        totalOrlatura: true,
        totalTaglio: true,
        manovia1: true,
        manovia2: true,
        orlatura1: true,
        orlatura2: true,
        orlatura3: true,
        orlatura4: true,
        orlatura5: true,
        taglio1: true,
        taglio2: true,
      },
      orderBy: { productionDate: "asc" },
    });

    // Create a map of days with data
    const daysWithData = new Map();
    records.forEach((record) => {
      // Use UTC date to get the correct day
      const day = record.productionDate.getUTCDate();

      // Always calculate from individual fields (DB totals may be incorrect/outdated)
      const montaggio = (record.manovia1 || 0) + (record.manovia2 || 0);
      const orlatura =
        (record.orlatura1 || 0) +
        (record.orlatura2 || 0) +
        (record.orlatura3 || 0) +
        (record.orlatura4 || 0) +
        (record.orlatura5 || 0);
      const taglio = (record.taglio1 || 0) + (record.taglio2 || 0);
      const total = montaggio + orlatura + taglio;

      if (total > 0) {
        daysWithData.set(day, {
          id: record.id,
          total,
          hasData: true,
        });
      }
    });

    return {
      month,
      year,
      daysInMonth: endDate.getUTCDate(),
      firstDayOfWeek: startDate.getUTCDay(), // 0 = Sunday
      daysWithData: Object.fromEntries(daysWithData),
    };
  }

  // Get or create record by date
  async getByDate(date: string) {
    const productionDate = new Date(date);

    // Validate date
    if (isNaN(productionDate.getTime())) {
      throw new BadRequestException("Invalid date format. Expected YYYY-MM-DD");
    }

    // Force time to midnight for MySQL DATE compatibility
    productionDate.setHours(0, 0, 0, 0);

    let record = await this.prisma.productionRecord.findUnique({
      where: { productionDate },
      include: {
        creator: { select: { id: true, nome: true, userName: true } },
        updater: { select: { id: true, nome: true, userName: true } },
      },
    });

    if (!record) {
      // Return empty template for new record
      return {
        id: null,
        productionDate,
        manovia1: 0,
        manovia1Notes: null,
        manovia2: 0,
        manovia2Notes: null,
        orlatura1: 0,
        orlatura1Notes: null,
        orlatura2: 0,
        orlatura2Notes: null,
        orlatura3: 0,
        orlatura3Notes: null,
        orlatura4: 0,
        orlatura4Notes: null,
        orlatura5: 0,
        orlatura5Notes: null,
        taglio1: 0,
        taglio1Notes: null,
        taglio2: 0,
        taglio2Notes: null,
        totalMontaggio: 0,
        totalOrlatura: 0,
        totalTaglio: 0,
        creator: null,
        updater: null,
        isNew: true,
      };
    }

    return { ...record, isNew: false };
  }

  // Create or update record
  async upsert(date: string, data: any, userId: number) {
    const productionDate = new Date(date);

    const recordData = {
      manovia1: data.manovia1 || 0,
      manovia1Notes: data.manovia1Notes || null,
      manovia2: data.manovia2 || 0,
      manovia2Notes: data.manovia2Notes || null,
      orlatura1: data.orlatura1 || 0,
      orlatura1Notes: data.orlatura1Notes || null,
      orlatura2: data.orlatura2 || 0,
      orlatura2Notes: data.orlatura2Notes || null,
      orlatura3: data.orlatura3 || 0,
      orlatura3Notes: data.orlatura3Notes || null,
      orlatura4: data.orlatura4 || 0,
      orlatura4Notes: data.orlatura4Notes || null,
      orlatura5: data.orlatura5 || 0,
      orlatura5Notes: data.orlatura5Notes || null,
      taglio1: data.taglio1 || 0,
      taglio1Notes: data.taglio1Notes || null,
      taglio2: data.taglio2 || 0,
      taglio2Notes: data.taglio2Notes || null,
      updatedBy: userId,
    };

    return this.prisma.productionRecord.upsert({
      where: { productionDate },
      create: {
        productionDate,
        ...recordData,
        createdBy: userId,
      },
      update: recordData,
      include: {
        creator: { select: { id: true, nome: true, userName: true } },
        updater: { select: { id: true, nome: true, userName: true } },
      },
    });
  }

  // Get statistics for a period
  async getStatistics(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const records = await this.prisma.productionRecord.findMany({
      where: {
        productionDate: {
          gte: start,
          lte: end,
        },
      },
    });

    const totalMontaggio = records.reduce(
      (sum, r) => sum + (r.totalMontaggio || 0),
      0
    );
    const totalOrlatura = records.reduce(
      (sum, r) => sum + (r.totalOrlatura || 0),
      0
    );
    const totalTaglio = records.reduce(
      (sum, r) => sum + (r.totalTaglio || 0),
      0
    );
    const totalProduzione = totalMontaggio + totalOrlatura + totalTaglio;
    const daysWithData = records.filter(
      (r) =>
        (r.totalMontaggio || 0) +
          (r.totalOrlatura || 0) +
          (r.totalTaglio || 0) >
        0
    ).length;

    return {
      totalDays: records.length,
      daysWithData,
      totalMontaggio,
      totalOrlatura,
      totalTaglio,
      totalProduzione,
      avgMontaggio:
        daysWithData > 0 ? Math.round(totalMontaggio / daysWithData) : 0,
      avgOrlatura:
        daysWithData > 0 ? Math.round(totalOrlatura / daysWithData) : 0,
      avgTaglio: daysWithData > 0 ? Math.round(totalTaglio / daysWithData) : 0,
      avgProduzione:
        daysWithData > 0 ? Math.round(totalProduzione / daysWithData) : 0,
    };
  }

  // Get trend data for charts
  async getTrendData(days: number = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);

    const records = await this.prisma.productionRecord.findMany({
      where: {
        productionDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { productionDate: "asc" },
    });

    // Fill in missing days with zeros
    const data = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const record = records.find(
        (r) => r.productionDate.toISOString().split("T")[0] === dateStr
      );

      data.push({
        date: dateStr,
        montaggio: record?.totalMontaggio || 0,
        orlatura: record?.totalOrlatura || 0,
        taglio: record?.totalTaglio || 0,
        totale:
          (record?.totalMontaggio || 0) +
          (record?.totalOrlatura || 0) +
          (record?.totalTaglio || 0),
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return data;
  }

  // Get machine/station performance
  async getMachinePerformance(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const records = await this.prisma.productionRecord.findMany({
      where: {
        productionDate: {
          gte: start,
          lte: end,
        },
      },
    });

    const performance = {
      montaggio: {
        manovia1: records.reduce((sum, r) => sum + (r.manovia1 || 0), 0),
        manovia2: records.reduce((sum, r) => sum + (r.manovia2 || 0), 0),
      },
      orlatura: {
        orlatura1: records.reduce((sum, r) => sum + (r.orlatura1 || 0), 0),
        orlatura2: records.reduce((sum, r) => sum + (r.orlatura2 || 0), 0),
        orlatura3: records.reduce((sum, r) => sum + (r.orlatura3 || 0), 0),
        orlatura4: records.reduce((sum, r) => sum + (r.orlatura4 || 0), 0),
        orlatura5: records.reduce((sum, r) => sum + (r.orlatura5 || 0), 0),
      },
      taglio: {
        taglio1: records.reduce((sum, r) => sum + (r.taglio1 || 0), 0),
        taglio2: records.reduce((sum, r) => sum + (r.taglio2 || 0), 0),
      },
    };

    return performance;
  }

  // Compare two months
  async getComparison(
    month1: number,
    year1: number,
    month2: number,
    year2: number
  ) {
    const getMonthStats = async (month: number, year: number) => {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const records = await this.prisma.productionRecord.findMany({
        where: {
          productionDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const totalMontaggio = records.reduce(
        (sum, r) => sum + (r.totalMontaggio || 0),
        0
      );
      const totalOrlatura = records.reduce(
        (sum, r) => sum + (r.totalOrlatura || 0),
        0
      );
      const totalTaglio = records.reduce(
        (sum, r) => sum + (r.totalTaglio || 0),
        0
      );

      return {
        month,
        year,
        totalMontaggio,
        totalOrlatura,
        totalTaglio,
        total: totalMontaggio + totalOrlatura + totalTaglio,
      };
    };

    const [stats1, stats2] = await Promise.all([
      getMonthStats(month1, year1),
      getMonthStats(month2, year2),
    ]);

    const percentChange =
      stats1.total > 0
        ? Math.round(((stats2.total - stats1.total) / stats1.total) * 100)
        : 0;

    return {
      current: stats2,
      previous: stats1,
      percentChange,
    };
  }

  // Get today's stats for dashboard
  async getTodayStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await this.prisma.productionRecord.findUnique({
      where: { productionDate: today },
    });

    if (!record) {
      return { total: 0, montaggio: 0, orlatura: 0, taglio: 0 };
    }

    return {
      total:
        (record.totalMontaggio || 0) +
        (record.totalOrlatura || 0) +
        (record.totalTaglio || 0),
      montaggio: record.totalMontaggio || 0,
      orlatura: record.totalOrlatura || 0,
      taglio: record.totalTaglio || 0,
    };
  }

  // Get this week's stats (Mon-Sat)
  async getWeekStats() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);

    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);

    const records = await this.prisma.productionRecord.findMany({
      where: {
        productionDate: {
          gte: monday,
          lte: saturday,
        },
      },
    });

    const totalMontaggio = records.reduce(
      (sum, r) => sum + (r.totalMontaggio || 0),
      0
    );
    const totalOrlatura = records.reduce(
      (sum, r) => sum + (r.totalOrlatura || 0),
      0
    );
    const totalTaglio = records.reduce(
      (sum, r) => sum + (r.totalTaglio || 0),
      0
    );

    return {
      total: totalMontaggio + totalOrlatura + totalTaglio,
      montaggio: totalMontaggio,
      orlatura: totalOrlatura,
      taglio: totalTaglio,
      weekStart: monday.toISOString().split("T")[0],
      weekEnd: saturday.toISOString().split("T")[0],
    };
  }

  // Get this month's stats
  async getMonthStats(month?: number, year?: number) {
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0);

    const records = await this.prisma.productionRecord.findMany({
      where: {
        productionDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalMontaggio = records.reduce(
      (sum, r) => sum + (r.totalMontaggio || 0),
      0
    );
    const totalOrlatura = records.reduce(
      (sum, r) => sum + (r.totalOrlatura || 0),
      0
    );
    const totalTaglio = records.reduce(
      (sum, r) => sum + (r.totalTaglio || 0),
      0
    );
    const total = totalMontaggio + totalOrlatura + totalTaglio;
    const daysWithData = records.filter(
      (r) =>
        (r.totalMontaggio || 0) +
          (r.totalOrlatura || 0) +
          (r.totalTaglio || 0) >
        0
    ).length;

    return {
      total,
      montaggio: totalMontaggio,
      orlatura: totalOrlatura,
      taglio: totalTaglio,
      daysWithData,
      average: daysWithData > 0 ? Math.round(total / daysWithData) : 0,
      month: targetMonth,
      year: targetYear,
    };
  }
}
