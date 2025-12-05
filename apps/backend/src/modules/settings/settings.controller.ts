import {
  Controller,
  Get,
  Post,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { SettingsService, ImportProgress, ImportAnalysis } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // Step 1: Analyze Excel file
  @Post('analyze-excel')
  @UseInterceptors(FileInterceptor('file'))
  async analyzeExcel(@UploadedFile() file: Express.Multer.File): Promise<ImportAnalysis> {
    if (!file) {
      throw new BadRequestException('File non fornito');
    }

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];

    if (!validTypes.includes(file.mimetype) && !file.originalname.endsWith('.xlsx')) {
      throw new BadRequestException('File non valido. Carica un file Excel (.xlsx)');
    }

    return this.settingsService.analyzeExcel(file.buffer);
  }

  // Step 2: Execute import after confirmation
  @Post('execute-import')
  async executeImport() {
    return this.settingsService.executeImport();
  }

  // Cancel pending import
  @Delete('cancel-import')
  cancelImport() {
    this.settingsService.cancelImport();
    return { success: true, message: 'Import annullato' };
  }

  // Get import progress
  @Get('import-progress')
  getImportProgress(): ImportProgress {
    return this.settingsService.getImportProgress();
  }
}
