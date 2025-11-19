import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WidgetsService {
  constructor(private prisma: PrismaService) {}

  async getAvailableWidgets() {
    return this.prisma.availableWidget.findMany({
      where: { attivo: true },
      orderBy: { category: 'asc' },
    });
  }

  async getUserWidgets(userId: number) {
    return this.prisma.userWidget.findMany({
      where: { userId },
      include: { widget: true },
      orderBy: [{ y: 'asc' }, { x: 'asc' }],
    });
  }

  async saveUserWidgets(userId: number, widgets: any[]) {
    // Delete existing widgets
    await this.prisma.userWidget.deleteMany({
      where: { userId },
    });

    // Create new widgets
    if (widgets.length > 0) {
      await this.prisma.userWidget.createMany({
        data: widgets.map(w => ({
          userId,
          widgetId: w.widgetId,
          x: w.x,
          y: w.y,
          width: w.width,
          height: w.height,
          config: w.config || {},
        })),
      });
    }

    return this.getUserWidgets(userId);
  }

  async getDashboardStats() {
    const [
      riparazioniAperte,
      qualityRecordsToday,
      ddtBozze,
      scmLanciAttivi,
    ] = await Promise.all([
      this.prisma.riparazione.count({ where: { stato: 'aperta' } }),
      this.prisma.qualityRecord.count({
        where: {
          dataControllo: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      this.prisma.exportDocument.count({ where: { stato: 'bozza' } }),
      this.prisma.scmLaunch.count({ where: { stato: 'in_corso' } }),
    ]);

    return {
      riparazioniAperte,
      qualityRecordsToday,
      ddtBozze,
      scmLanciAttivi,
    };
  }

  async getRecentActivities(limit = 10) {
    return this.prisma.activityLog.findMany({
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
