import { Module } from '@nestjs/common';
import { FileManagerController } from './file-manager.controller';
import { FileManagerService } from './file-manager.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { MinioModule } from '../../services/minio.module';

@Module({
  imports: [PrismaModule, MinioModule],
  controllers: [FileManagerController],
  providers: [FileManagerService],
  exports: [FileManagerService],
})
export class FileManagerModule {}
