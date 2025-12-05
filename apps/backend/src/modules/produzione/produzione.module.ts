import { Module, forwardRef } from '@nestjs/common';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ProduzioneController } from './produzione.controller';
import { ProduzioneService } from './produzione.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [PrismaModule, forwardRef(() => JobsModule)],
  controllers: [ProduzioneController],
  providers: [ProduzioneService, PermissionsGuard],
  exports: [ProduzioneService],
})
export class ProduzioneModule {}
