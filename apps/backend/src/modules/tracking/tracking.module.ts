import { Module, forwardRef } from '@nestjs/common';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [PrismaModule, forwardRef(() => JobsModule)],
  controllers: [TrackingController],
  providers: [TrackingService, PermissionsGuard],
  exports: [TrackingService],
})
export class TrackingModule {}
