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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
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

@ApiTags('SCM')
@Controller('scm')
export class ScmController {
  constructor(private readonly scmService: ScmService) {}

  // ==================== PUBLIC ENDPOINTS (Laboratory Access) ====================

  @ApiOperation({ summary: 'Login laboratorio esterno' })
  @Post('login')
  async login(@Body() credentials: { username: string; password: string }) {
    return this.scmService.loginLaboratory(credentials.username, credentials.password);
  }

  @ApiOperation({ summary: 'Dashboard laboratorio' })
  @Get('dashboard')
  async getDashboard(@Query('laboratoryId') laboratoryId?: string) {
    const labId = laboratoryId ? parseInt(laboratoryId, 10) : undefined;
    return this.scmService.getDashboard(labId);
  }

  // ==================== ADMIN ENDPOINTS ====================

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('scm_admin')
  @ApiOperation({ summary: 'Recupera statistics' })
  @Get('statistics')
  async getStatistics(@Query('laboratoryId') laboratoryId?: string) {
    return this.scmService.getStatistics(laboratoryId ? parseInt(laboratoryId, 10) : undefined);
  }

  // ==================== LABORATORIES ====================

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('scm_admin')
  @ApiOperation({ summary: 'Recupera laboratories' })
  @Get('laboratories')
  async getLaboratories(@Query('attivo') attivo?: string) {
    const filters: any = {};
    if (attivo !== undefined) {
      filters.attivo = attivo === 'true';
    }
    return this.scmService.getLaboratories(Object.keys(filters).length > 0 ? filters : undefined);
  }

  @ApiOperation({ summary: 'Recupera laboratories' })
  @Get('laboratories/:id')
  async getLaboratory(@Param('id', ParseIntPipe) id: number) {
    return this.scmService.getLaboratory(id);
  }

  @ApiOperation({ summary: 'Crea laboratories' })
  @Post('laboratories')
  async createLaboratory(@Body() data: CreateLaboratoryDto) {
    return this.scmService.createLaboratory(data);
  }

  @ApiOperation({ summary: 'Aggiorna laboratories' })
  @Put('laboratories/:id')
  async updateLaboratory(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateLaboratoryDto
  ) {
    return this.scmService.updateLaboratory(id, data);
  }

  @ApiOperation({ summary: 'Elimina laboratories' })
  @Delete('laboratories/:id')
  async deleteLaboratory(@Param('id', ParseIntPipe) id: number) {
    return this.scmService.deleteLaboratory(id);
  }

  // ==================== LAUNCHES ====================

  @ApiOperation({ summary: 'Recupera launches' })
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

  @ApiOperation({ summary: 'Recupera launches' })
  @Get('launches/:id')
  async getLaunch(@Param('id') id: string) {
    // Gestisci il caso "new" o altri parametri non numerici
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new Error(`Invalid launch ID: ${id}`);
    }
    return this.scmService.getLaunch(numericId);
  }

  @ApiOperation({ summary: 'Crea launches' })
  @Post('launches')
  async createLaunch(@Body() data: CreateLaunchDto) {
    return this.scmService.createLaunch(data);
  }

  @ApiOperation({ summary: 'Aggiorna launches' })
  @Put('launches/:id')
  async updateLaunch(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateLaunchDto
  ) {
    return this.scmService.updateLaunch(id, data);
  }

  @ApiOperation({ summary: 'Elimina launches' })
  @Delete('launches/:id')
  async deleteLaunch(@Param('id', ParseIntPipe) id: number) {
    return this.scmService.deleteLaunch(id);
  }

  // ==================== LAUNCH ARTICLES ====================

  @ApiOperation({ summary: 'Crea articles' })
  @Post('launches/:launchId/articles')
  async addArticleToLaunch(
    @Param('launchId', ParseIntPipe) launchId: number,
    @Body() data: CreateLaunchArticleDto
  ) {
    return this.scmService.addArticleToLaunch(launchId, data);
  }

  @ApiOperation({ summary: 'Aggiorna articles' })
  @Put('articles/:id')
  async updateLaunchArticle(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateLaunchArticleDto
  ) {
    return this.scmService.updateLaunchArticle(id, data);
  }

  @ApiOperation({ summary: 'Elimina articles' })
  @Delete('articles/:id')
  async deleteLaunchArticle(@Param('id', ParseIntPipe) id: number) {
    return this.scmService.deleteLaunchArticle(id);
  }

  // ==================== ARTICLE PHASES ====================

  @ApiOperation({ summary: 'Aggiorna phases' })
  @Put('phases/:id')
  async updateArticlePhase(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateLaunchPhaseDto
  ) {
    return this.scmService.updateArticlePhase(id, data);
  }

  // ==================== PROGRESS TRACKING ====================

  @ApiOperation({ summary: 'Crea progress' })
  @Post('phases/:phaseId/progress')
  async addProgressTracking(
    @Param('phaseId', ParseIntPipe) phaseId: number,
    @Body() data: AddProgressTrackingDto
  ) {
    return this.scmService.addProgressTracking(phaseId, data);
  }

  @ApiOperation({ summary: 'Recupera progress' })
  @Get('phases/:phaseId/progress')
  async getProgressTracking(@Param('phaseId', ParseIntPipe) phaseId: number) {
    return this.scmService.getProgressTracking(phaseId);
  }

  // ==================== STANDARD PHASES ====================

  @ApiOperation({ summary: 'Recupera standard-phases' })
  @Get('standard-phases')
  async getStandardPhases(@Query('attivo') attivo?: string) {
    const attivoBoolean = attivo !== undefined ? attivo === 'true' : undefined;
    return this.scmService.getStandardPhases(attivoBoolean);
  }

  @ApiOperation({ summary: 'Recupera standard-phases' })
  @Get('standard-phases/:id')
  async getStandardPhase(@Param('id', ParseIntPipe) id: number) {
    return this.scmService.getStandardPhase(id);
  }

  @ApiOperation({ summary: 'Crea standard-phases' })
  @Post('standard-phases')
  async createStandardPhase(@Body() data: CreateStandardPhaseDto) {
    return this.scmService.createStandardPhase(data);
  }

  @ApiOperation({ summary: 'Aggiorna standard-phases' })
  @Put('standard-phases/:id')
  async updateStandardPhase(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateStandardPhaseDto
  ) {
    return this.scmService.updateStandardPhase(id, data);
  }

  @ApiOperation({ summary: 'Elimina standard-phases' })
  @Delete('standard-phases/:id')
  async deleteStandardPhase(@Param('id', ParseIntPipe) id: number) {
    return this.scmService.deleteStandardPhase(id);
  }

  // ==================== SETTINGS ====================

  @ApiOperation({ summary: 'Recupera settings' })
  @Get('settings')
  async getSettings() {
    return this.scmService.getSettings();
  }

  @ApiOperation({ summary: 'Recupera settings' })
  @Get('settings/:key')
  async getSetting(@Param('key') key: string) {
    return this.scmService.getSetting(key);
  }

  @ApiOperation({ summary: 'Aggiorna settings' })
  @Put('settings/:key')
  async setSetting(@Param('key') key: string, @Body('value') value: string) {
    return this.scmService.setSetting(key, value);
  }

  @ApiOperation({ summary: 'Crea batch' })
  @Post('settings/batch')
  async setMultipleSettings(@Body() settings: Record<string, string>) {
    return this.scmService.setMultipleSettings(settings);
  }
}
