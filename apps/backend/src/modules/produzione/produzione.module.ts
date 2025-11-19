import { Module } from '@nestjs/common';
import { ProduzioneController } from './produzione.controller';
import { ProduzioneService } from './produzione.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProduzioneController],
  providers: [ProduzioneService],
  exports: [ProduzioneService],
})
export class ProduzioneModule {}
