import { Module, forwardRef } from '@nestjs/common';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AnaliticheService } from './analitiche.service';
import { AnaliticheController } from './analitiche.controller';
import { ExcelImportService } from './excel-import.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [PrismaModule, forwardRef(() => JobsModule)],
  controllers: [AnaliticheController],
  providers: [AnaliticheService, ExcelImportService, PermissionsGuard],
  exports: [AnaliticheService, ExcelImportService],
})
export class AnaliticheModule {}
