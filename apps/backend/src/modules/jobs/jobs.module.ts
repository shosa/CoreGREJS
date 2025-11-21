import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { TrackingModule } from '../tracking/tracking.module';
import { ProduzioneModule } from '../produzione/produzione.module';
import { ExportModule } from '../export/export.module';
import { JobsService } from './jobs.service';
import { JobsQueueService } from './jobs.queue';
import { JobsController } from './jobs.controller';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    forwardRef(() => TrackingModule),
    forwardRef(() => ProduzioneModule),
    forwardRef(() => ExportModule),
  ],
  providers: [JobsService, JobsQueueService],
  controllers: [JobsController],
  exports: [JobsService, JobsQueueService],
})
export class JobsModule {}
