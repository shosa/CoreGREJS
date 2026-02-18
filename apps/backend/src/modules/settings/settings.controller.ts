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
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { SettingsService, ImportProgress, ImportAnalysis } from './settings.service';
import { LogActivity } from '../../common/decorators/log-activity.decorator';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // Step 1: Analyze Excel file
  @Post('analyze-excel')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('settings')
  @LogActivity({ module: 'settings', action: 'analyze_excel', entity: 'Import', description: 'Analisi file Excel per import' })
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
  @LogActivity({ module: 'settings', action: 'execute_import', entity: 'Import', description: 'Esecuzione import dati da Excel' })
  async executeImport() {
    return this.settingsService.executeImport();
  }

  // Cancel pending import
  @Delete('cancel-import')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('settings')
  @LogActivity({ module: 'settings', action: 'cancel_import', entity: 'Import', description: 'Annullamento import' })
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
  @LogActivity({ module: 'settings', action: 'update_module', entity: 'Module', description: 'Modifica stato modulo' })
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
  @LogActivity({ module: 'settings', action: 'update_modules_bulk', entity: 'Module', description: 'Modifica multipla stato moduli' })
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
  @LogActivity({ module: 'settings', action: 'update_smtp', entity: 'SmtpConfig', description: 'Modifica configurazione SMTP' })
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
  @LogActivity({ module: 'settings', action: 'update_produzione_emails', entity: 'EmailConfig', description: 'Modifica email produzione' })
  async updateProduzioneEmailConfig(@Body('emails') emails: string[]) {
    return this.settingsService.updateProduzioneEmailConfig(emails);
  }

  // ==================== GENERALI ====================

  @Get('general')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('settings')
  async getGeneralConfig() {
    return this.settingsService.getGeneralConfig();
  }

  @Put('general')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('settings')
  @LogActivity({ module: 'settings', action: 'update_general', entity: 'GeneralConfig', description: 'Modifica impostazioni generali' })
  async updateGeneralConfig(@Body() data: Record<string, string>) {
    return this.settingsService.updateGeneralConfig(data);
  }

  // ==================== SICUREZZA ====================

  @Get('security')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('settings')
  async getSecurityConfig() {
    return this.settingsService.getSecurityConfig();
  }

  @Put('security')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('settings')
  @LogActivity({ module: 'settings', action: 'update_security', entity: 'SecurityConfig', description: 'Modifica impostazioni sicurezza' })
  async updateSecurityConfig(@Body() data: Record<string, any>) {
    return this.settingsService.updateSecurityConfig(data);
  }

  // ==================== EXPORT DEFAULTS ====================

  @Get('export-defaults')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('settings')
  async getExportDefaults() {
    return this.settingsService.getExportDefaults();
  }

  @Put('export-defaults')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('settings')
  @LogActivity({ module: 'settings', action: 'update_export_defaults', entity: 'ExportDefaults', description: 'Modifica valori default export' })
  async updateExportDefaults(@Body() data: Record<string, string>) {
    return this.settingsService.updateExportDefaults(data);
  }

  // ==================== SOGLIE QUALITA ====================

  @Get('quality')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('settings')
  async getQualityThresholds() {
    return this.settingsService.getQualityThresholds();
  }

  @Put('quality')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('settings')
  @LogActivity({ module: 'settings', action: 'update_quality', entity: 'QualityThresholds', description: 'Modifica soglie qualità' })
  async updateQualityThresholds(@Body() data: Record<string, number>) {
    return this.settingsService.updateQualityThresholds(data);
  }

  // ==================== TEST SMTP ====================

  @Post('smtp/test')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('settings')
  @LogActivity({ module: 'settings', action: 'test_smtp', entity: 'SmtpConfig', description: 'Test connessione SMTP' })
  async testSmtp(@Body('email') email: string) {
    return this.settingsService.testSmtp(email);
  }

  // ==================== BACKUP / RIPRISTINO ====================

  @Get('backup/export')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('settings')
  @LogActivity({ module: 'settings', action: 'export_backup', entity: 'Backup', description: 'Esportazione backup impostazioni' })
  async exportSettings(@Res() res: Response) {
    const data = await this.settingsService.exportSettings();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=settings-backup-${new Date().toISOString().split('T')[0]}.json`);
    res.json(data);
  }

  @Post('backup/import')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('settings')
  @LogActivity({ module: 'settings', action: 'import_backup', entity: 'Backup', description: 'Importazione backup impostazioni' })
  async importSettings(@Body() data: any) {
    return this.settingsService.importSettings(data);
  }

  // ==================== SYSTEM INFO ====================

  @Get('system')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('settings')
  async getSystemInfo() {
    return this.settingsService.getSystemInfo();
  }

  @Post('cache/flush')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('settings')
  @LogActivity({ module: 'settings', action: 'flush_cache', entity: 'Cache', description: 'Svuotamento cache Redis' })
  async flushCache() {
    return this.settingsService.flushCache();
  }

  // ==================== CRONOLOGIA ====================

  @Get('changelog')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('settings')
  async getChangelog(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.settingsService.getSettingsChangelog(
      parseInt(page || '1'),
      parseInt(limit || '20'),
    );
  }
}
