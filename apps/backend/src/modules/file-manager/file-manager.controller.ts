import { Controller, Get, Delete, Query, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { FileManagerService } from './file-manager.service';
import { FileFilterDto, DeleteFilesDto } from './dto/file-filter.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FileManagerController {
  constructor(private readonly fileManager: FileManagerService) {}

  @Get()
  async listFiles(@Query() filter: FileFilterDto) {
    const page = filter.page || 1;
    const limit = filter.limit || 50;

    return this.fileManager.listFiles(
      {
        userId: filter.userId,
        jobId: filter.jobId,
        dateFrom: filter.dateFrom ? new Date(filter.dateFrom) : undefined,
        dateTo: filter.dateTo ? new Date(filter.dateTo) : undefined,
        mimeType: filter.mimeType,
        search: filter.search,
      },
      page,
      limit,
    );
  }

  @Get('stats')
  async getStats() {
    return this.fileManager.getStats();
  }

  @Get(':id/download')
  async getDownloadUrl(@Param('id', ParseIntPipe) id: number) {
    const url = await this.fileManager.getDownloadUrl(id);
    return { url };
  }

  @Delete(':id')
  async deleteFile(@Param('id', ParseIntPipe) id: number) {
    await this.fileManager.deleteFile(id);
    return { success: true };
  }

  @Delete()
  async deleteFiles(@Query() filter: DeleteFilesDto) {
    const result = await this.fileManager.deleteFiles({
      userId: filter.userId,
      jobId: filter.jobId,
      dateFrom: filter.dateFrom ? new Date(filter.dateFrom) : undefined,
      dateTo: filter.dateTo ? new Date(filter.dateTo) : undefined,
      mimeType: filter.mimeType,
    });
    return result;
  }

  @Get('sync/minio')
  async syncFromMinio() {
    return this.fileManager.syncFromMinio();
  }
}
