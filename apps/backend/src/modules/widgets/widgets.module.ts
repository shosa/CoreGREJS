import { Module } from '@nestjs/common';
import { WidgetsController } from './widgets.controller';
import { WidgetsService } from './widgets.service';
import { ProduzioneModule } from '../produzione/produzione.module';

@Module({
  imports: [ProduzioneModule],
  controllers: [WidgetsController],
  providers: [WidgetsService],
  exports: [WidgetsService],
})
export class WidgetsModule {}
