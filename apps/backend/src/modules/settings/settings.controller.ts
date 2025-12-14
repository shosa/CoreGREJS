import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Body,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { SettingsService, ImportProgress, ImportAnalysis } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // Step 1: Analyze Excel file
  @Post('analyze-excel')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('settings')
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
  @UseGuards(PermissionsGuard)
  @RequirePermissions('settings')
  async executeImport() {
    return this.settingsService.executeImport();
  }

  // Cancel pending import
  @Delete('cancel-import')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('settings')
  cancelImport() {
    this.settingsService.cancelImport();
    return { success: true, message: 'Import annullato' };
  }

  // Get import progress
  @Get('import-progress')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('settings')
  getImportProgress(): ImportProgress {
    return this.settingsService.getImportProgress();
  }

  // ==================== MODULE MANAGEMENT ====================

  // Get all active modules - Accessible to all authenticated users
  @Get('modules')
  async getActiveModules() {
    return this.settingsService.getActiveModules();
  }

  // Update single module status - Requires settings permission
  @Put('modules/:moduleName')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('settings')
  async updateModuleStatus(
    @Param('moduleName') moduleName: string,
    @Body('enabled') enabled: boolean,
  ) {
    return this.settingsService.updateModuleStatus(moduleName, enabled);
  }

  // Update multiple modules at once - Requires settings permission
  @Put('modules')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('settings')
  async updateMultipleModules(@Body() modules: Record<string, boolean>) {
    return this.settingsService.updateMultipleModules(modules);
  }

  // ==================== SMTP CONFIGURATION ====================

  @Get('smtp')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('settings')
  async getSmtpConfig() {
    return this.settingsService.getSmtpConfig();
  }

  @Put('smtp')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('settings')
  async updateSmtpConfig(@Body() config: any) {
    return this.settingsService.updateSmtpConfig(config);
  }

  // ==================== PRODUZIONE EMAIL CONFIGURATION ====================

  @Get('produzione/emails')
  async getProduzioneEmailConfig() {
    return this.settingsService.getProduzioneEmailConfig();
  }

  @Put('produzione/emails')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('settings')
  async updateProduzioneEmailConfig(@Body('emails') emails: string[]) {
    return this.settingsService.updateProduzioneEmailConfig(emails);
  }
}
