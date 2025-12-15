import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  ParseBoolPipe,
  UseGuards,
} from '@nestjs/common';
import { ScmService } from './scm.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import {
  CreateLaboratoryDto,
  UpdateLaboratoryDto,
} from './dto/laboratory.dto';
import {
  CreateLaunchDto,
  UpdateLaunchDto,
  UpdateLaunchArticleDto,
  UpdateLaunchPhaseDto,
  AddProgressTrackingDto,
  CreateLaunchArticleDto,
} from './dto/launch.dto';
import {
  CreateStandardPhaseDto,
  UpdateStandardPhaseDto,
} from './dto/standard-phase.dto';

@Controller('scm')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('scm_admin')
export class ScmController {
  constructor(private readonly scmService: ScmService) {}

  // ==================== STATISTICS ====================

  @Get('statistics')
  async getStatistics(@Query('laboratoryId') laboratoryId?: string) {
    return this.scmService.getStatistics(laboratoryId ? parseInt(laboratoryId, 10) : undefined);
  }

  // ==================== LABORATORIES ====================

  @Get('laboratories')
  async getLaboratories(@Query('attivo') attivo?: string) {
    const filters: any = {};
    if (attivo !== undefined) {
      filters.attivo = attivo === 'true';
    }
    return this.scmService.getLaboratories(Object.keys(filters).length > 0 ? filters : undefined);
  }

  @Get('laboratories/:id')
  async getLaboratory(@Param('id', ParseIntPipe) id: number) {
    return this.scmService.getLaboratory(id);
  }

  @Post('laboratories')
  async createLaboratory(@Body() data: CreateLaboratoryDto) {
    return this.scmService.createLaboratory(data);
  }

  @Put('laboratories/:id')
  async updateLaboratory(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateLaboratoryDto
  ) {
    return this.scmService.updateLaboratory(id, data);
  }

  @Delete('laboratories/:id')
  async deleteLaboratory(@Param('id', ParseIntPipe) id: number) {
    return this.scmService.deleteLaboratory(id);
  }

  // ==================== LAUNCHES ====================

  @Get('launches')
  async getLaunches(
    @Query('laboratoryId') laboratoryId?: string,
    @Query('stato') stato?: string,
    @Query('dataLancioFrom') dataLancioFrom?: string,
    @Query('dataLancioTo') dataLancioTo?: string,
    @Query('limit') limit?: string
  ) {
    const filters: any = {};

    if (laboratoryId) {
      filters.laboratoryId = parseInt(laboratoryId, 10);
    }

    if (stato) {
      filters.stato = stato;
    }

    if (dataLancioFrom) {
      filters.dataLancioFrom = new Date(dataLancioFrom);
    }

    if (dataLancioTo) {
      filters.dataLancioTo = new Date(dataLancioTo);
    }

    if (limit) {
      filters.limit = parseInt(limit, 10);
    }

    return this.scmService.getLaunches(filters);
  }

  @Get('launches/:id')
  async getLaunch(@Param('id') id: string) {
    // Gestisci il caso "new" o altri parametri non numerici
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new Error(`Invalid launch ID: ${id}`);
    }
    return this.scmService.getLaunch(numericId);
  }

  @Post('launches')
  async createLaunch(@Body() data: CreateLaunchDto) {
    return this.scmService.createLaunch(data);
  }

  @Put('launches/:id')
  async updateLaunch(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateLaunchDto
  ) {
    return this.scmService.updateLaunch(id, data);
  }

  @Delete('launches/:id')
  async deleteLaunch(@Param('id', ParseIntPipe) id: number) {
    return this.scmService.deleteLaunch(id);
  }

  // ==================== LAUNCH ARTICLES ====================

  @Post('launches/:launchId/articles')
  async addArticleToLaunch(
    @Param('launchId', ParseIntPipe) launchId: number,
    @Body() data: CreateLaunchArticleDto
  ) {
    return this.scmService.addArticleToLaunch(launchId, data);
  }

  @Put('articles/:id')
  async updateLaunchArticle(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateLaunchArticleDto
  ) {
    return this.scmService.updateLaunchArticle(id, data);
  }

  @Delete('articles/:id')
  async deleteLaunchArticle(@Param('id', ParseIntPipe) id: number) {
    return this.scmService.deleteLaunchArticle(id);
  }

  // ==================== ARTICLE PHASES ====================

  @Put('phases/:id')
  async updateArticlePhase(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateLaunchPhaseDto
  ) {
    return this.scmService.updateArticlePhase(id, data);
  }

  // ==================== PROGRESS TRACKING ====================

  @Post('phases/:phaseId/progress')
  async addProgressTracking(
    @Param('phaseId', ParseIntPipe) phaseId: number,
    @Body() data: AddProgressTrackingDto
  ) {
    return this.scmService.addProgressTracking(phaseId, data);
  }

  @Get('phases/:phaseId/progress')
  async getProgressTracking(@Param('phaseId', ParseIntPipe) phaseId: number) {
    return this.scmService.getProgressTracking(phaseId);
  }

  // ==================== STANDARD PHASES ====================

  @Get('standard-phases')
  async getStandardPhases(@Query('attivo') attivo?: string) {
    const attivoBoolean = attivo !== undefined ? attivo === 'true' : undefined;
    return this.scmService.getStandardPhases(attivoBoolean);
  }

  @Get('standard-phases/:id')
  async getStandardPhase(@Param('id', ParseIntPipe) id: number) {
    return this.scmService.getStandardPhase(id);
  }

  @Post('standard-phases')
  async createStandardPhase(@Body() data: CreateStandardPhaseDto) {
    return this.scmService.createStandardPhase(data);
  }

  @Put('standard-phases/:id')
  async updateStandardPhase(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateStandardPhaseDto
  ) {
    return this.scmService.updateStandardPhase(id, data);
  }

  @Delete('standard-phases/:id')
  async deleteStandardPhase(@Param('id', ParseIntPipe) id: number) {
    return this.scmService.deleteStandardPhase(id);
  }

  // ==================== SETTINGS ====================

  @Get('settings')
  async getSettings() {
    return this.scmService.getSettings();
  }

  @Get('settings/:key')
  async getSetting(@Param('key') key: string) {
    return this.scmService.getSetting(key);
  }

  @Put('settings/:key')
  async setSetting(@Param('key') key: string, @Body('value') value: string) {
    return this.scmService.setSetting(key, value);
  }

  @Post('settings/batch')
  async setMultipleSettings(@Body() settings: Record<string, string>) {
    return this.scmService.setMultipleSettings(settings);
  }
}
