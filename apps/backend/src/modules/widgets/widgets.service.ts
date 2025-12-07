import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProduzioneService } from '../produzione/produzione.service';

@Injectable()
export class WidgetsService {
  constructor(
    private prisma: PrismaService,
    private produzioneService: ProduzioneService,
  ) {}

  async getUserWidgets(userId: number) {
    return this.prisma.authWidgetConfig.findMany({
      where: { userId },
      orderBy: [{ y: 'asc' }, { x: 'asc' }],
    });
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
    const [
      riparazioniAperte,
      qualityRecordsToday,
      ddtBozze,
      scmLanciAttivi,
      produzioneOggi,
    ] = await Promise.all([
      this.prisma.riparazione.count({ where: { completa: false } }),
      this.prisma.qualityRecord.count({
        where: {
          dataControllo: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      this.prisma.exportDocument.count({ where: { stato: 'bozza' } }),
      this.prisma.scmLaunch.count({ where: { stato: 'in_corso' } }),
      this.produzioneService.getTodayStats(),
    ]);

    return {
      riparazioniAperte,
      riparazioniMie: 0, // Keeping for compatibility
      qualityRecordsToday,
      ddtBozze,
      scmLanciAttivi,
      produzioneOggi: produzioneOggi.total,
      produzioneOggiFasi: produzioneOggi.byPhase,
    };
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
