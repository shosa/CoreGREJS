import { Module } from '@nestjs/common';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';
import { ExcelProcessorService } from './excel-processor.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ExportController],
  providers: [ExportService, ExcelProcessorService],
  exports: [ExportService, ExcelProcessorService],
})
export class ExportModule {}
