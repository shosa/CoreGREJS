import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [SettingsController],
  providers: [SettingsService, PermissionsGuard],
  exports: [SettingsService],
})
export class SettingsModule {}
