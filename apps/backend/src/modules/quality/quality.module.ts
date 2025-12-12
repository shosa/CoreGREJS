import { Module } from '@nestjs/common';
import { QualityController } from './quality.controller';
import { QualityService } from './quality.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { JobsModule } from '../jobs/jobs.module';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Module({
  imports: [PrismaModule, JobsModule],
  controllers: [QualityController],
  providers: [QualityService, PermissionsGuard],
  exports: [QualityService],
})
export class QualityModule {}
