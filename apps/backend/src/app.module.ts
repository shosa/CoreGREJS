import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RiparazioniModule } from './modules/riparazioni/riparazioni.module';
import { QualityModule } from './modules/quality/quality.module';
import { ProduzioneModule } from './modules/produzione/produzione.module';
import { ExportModule } from './modules/export/export.module';
import { ScmModule } from './modules/scm/scm.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { MrpModule } from './modules/mrp/mrp.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SystemModule } from './modules/system/system.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { WidgetsModule } from './modules/widgets/widgets.module';
import { CronModule } from './modules/cron/cron.module';
import { ActivityLogModule } from './modules/activity-log/activity-log.module';
import { DatabaseModule } from './modules/database/database.module';
import { SearchModule } from './modules/search/search.module';
import { EtichetteModule } from './modules/etichette/etichette.module';
import { InworkModule } from './modules/inwork/inwork.module';
import { MobileApiModule } from './modules/mobile-api/mobile-api.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    RiparazioniModule,
    QualityModule,
    ProduzioneModule,
    ExportModule,
    ScmModule,
    TrackingModule,
    MrpModule,
    SettingsModule,
    SystemModule,
    NotificationsModule,
    WidgetsModule,
    CronModule,
    ActivityLogModule,
    DatabaseModule,
    SearchModule,
    EtichetteModule,
    InworkModule,
    MobileApiModule,
    JobsModule,
  ],
})
export class AppModule {}
