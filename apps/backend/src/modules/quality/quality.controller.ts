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
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { QualityService } from './quality.service';
import { JobsQueueService } from '../jobs/jobs.queue';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { LogActivity } from '../../common/decorators/log-activity.decorator';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  CreateDefectTypeDto,
  UpdateDefectTypeDto,
  CreateRecordDto,
  FilterRecordsDto,
  GenerateReportDto,
} from './dto';

@ApiTags('Quality')
@ApiBearerAuth()
@Controller('quality')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('quality')
export class QualityController {
  constructor(
    private readonly qualityService: QualityService,
    private readonly jobsQueueService: JobsQueueService,
  ) {}

  // ==================== DASHBOARD ====================

  /**
   * GET /quality/dashboard/stats
   * Get dashboard statistics
   */
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @Get('dashboard/stats')
  async getDashboardStats() {
    return this.qualityService.getDashboardStats();
  }

  /**
   * GET /quality/dashboard/weekly-records
   * Get weekly records count
   */
  @ApiOperation({ summary: 'Get weekly records count' })
  @Get('dashboard/weekly-records')
  async getWeeklyRecords() {
    return this.qualityService.getWeeklyRecords();
  }

  /**
   * GET /quality/dashboard/exceptions-by-department
   * Get exceptions count by department
   */
  @ApiOperation({ summary: 'Get exceptions count by department' })
  @Get('dashboard/exceptions-by-department')
  async getExceptionsByDepartment() {
    return this.qualityService.getExceptionsByDepartment();
  }

  /**
   * GET /quality/dashboard/defect-rate-by-department
   * Get defect rate percentage by department
   */
  @ApiOperation({ summary: 'Get defect rate percentage by department' })
  @Get('dashboard/defect-rate-by-department')
  async getDefectRateByDepartment() {
    return this.qualityService.getDefectRateByDepartment();
  }

  // ==================== DEPARTMENTS ====================

  /**
   * GET /quality/departments
   * Get all departments
   */
  @ApiOperation({ summary: 'Get all departments' })
  @Get('departments')
  async getAllDepartments(@Query('active') active?: string) {
    if (active === 'true') {
      return this.qualityService.getActiveDepartments();
    }
    return this.qualityService.getAllDepartments();
  }

  /**
   * GET /quality/departments/:id
   * Get department by ID
   */
  @ApiOperation({ summary: 'Get department by ID' })
  @Get('departments/:id')
  async getDepartmentById(@Param('id', ParseIntPipe) id: number) {
    return this.qualityService.getDepartmentById(id);
  }

  /**
   * POST /quality/departments
   * Create new department
   */
  @ApiOperation({ summary: 'Create new department' })
  @Post('departments')
  @LogActivity({
    module: 'quality',
    action: 'create',
    entity: 'Department',
    description: 'Creazione reparto CQ',
  })
  async createDepartment(@Body() data: CreateDepartmentDto) {
    return this.qualityService.createDepartment(data);
  }

  /**
   * PUT /quality/departments/:id
   * Update department
   */
  @ApiOperation({ summary: 'Update department' })
  @Put('departments/:id')
  @LogActivity({
    module: 'quality',
    action: 'update',
    entity: 'Department',
    description: 'Modifica reparto CQ',
  })
  async updateDepartment(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateDepartmentDto
  ) {
    return this.qualityService.updateDepartment(id, data);
  }

  /**
   * DELETE /quality/departments/:id
   * Delete department
   */
  @ApiOperation({ summary: 'Delete department' })
  @Delete('departments/:id')
  @LogActivity({
    module: 'quality',
    action: 'delete',
    entity: 'Department',
    description: 'Eliminazione reparto CQ',
  })
  async deleteDepartment(@Param('id', ParseIntPipe) id: number) {
    return this.qualityService.deleteDepartment(id);
  }

  // ==================== DEFECT TYPES ====================

  /**
   * GET /quality/defect-types
   * Get all defect types
   */
  @ApiOperation({ summary: 'Get all defect types' })
  @Get('defect-types')
  async getAllDefectTypes(@Query('active') active?: string) {
    if (active === 'true') {
      return this.qualityService.getActiveDefectTypes();
    }
    return this.qualityService.getAllDefectTypes();
  }

  /**
   * GET /quality/defect-types/:id
   * Get defect type by ID
   */
  @ApiOperation({ summary: 'Get defect type by ID' })
  @Get('defect-types/:id')
  async getDefectTypeById(@Param('id', ParseIntPipe) id: number) {
    return this.qualityService.getDefectTypeById(id);
  }

  /**
   * POST /quality/defect-types
   * Create new defect type
   */
  @ApiOperation({ summary: 'Create new defect type' })
  @Post('defect-types')
  @LogActivity({
    module: 'quality',
    action: 'create',
    entity: 'DefectType',
    description: 'Creazione tipo difetto',
  })
  async createDefectType(@Body() data: CreateDefectTypeDto) {
    return this.qualityService.createDefectType(data);
  }

  /**
   * PUT /quality/defect-types/:id
   * Update defect type
   */
  @ApiOperation({ summary: 'Update defect type' })
  @Put('defect-types/:id')
  @LogActivity({
    module: 'quality',
    action: 'update',
    entity: 'DefectType',
    description: 'Modifica tipo difetto',
  })
  async updateDefectType(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateDefectTypeDto
  ) {
    return this.qualityService.updateDefectType(id, data);
  }

  /**
   * DELETE /quality/defect-types/:id
   * Delete defect type
   */
  @ApiOperation({ summary: 'Delete defect type' })
  @Delete('defect-types/:id')
  @LogActivity({
    module: 'quality',
    action: 'delete',
    entity: 'DefectType',
    description: 'Eliminazione tipo difetto',
  })
  async deleteDefectType(@Param('id', ParseIntPipe) id: number) {
    return this.qualityService.deleteDefectType(id);
  }

  // ==================== OPERATORS ====================

  /**
   * GET /quality/operators
   * Get all operators
   */
  @ApiOperation({ summary: 'Get all operators' })
  @Get('operators')
  async getAllOperators() {
    return this.qualityService.getAllOperators();
  }

  /**
   * GET /quality/operators/:username
   * Get operator by username
   */
  @ApiOperation({ summary: 'Get operator by username' })
  @Get('operators/:username')
  async getOperatorByUsername(@Param('username') username: string) {
    return this.qualityService.getOperatorByUsername(username);
  }

  /**
   * POST /quality/operators/authenticate
   * Authenticate operator with PIN
   */
  @ApiOperation({ summary: 'Authenticate operator with PIN' })
  @Post('operators/authenticate')
  async authenticateOperator(
    @Body() body: { username: string; pin: string }
  ) {
    return this.qualityService.authenticateOperator(body.username, body.pin);
  }

  // ==================== QUALITY RECORDS ====================

  /**
   * GET /quality/records
   * Get all quality records with filters
   */
  @ApiOperation({ summary: 'Get all quality records with filters' })
  @Get('records')
  async getAllRecords(@Query() filters: FilterRecordsDto) {
    return this.qualityService.getAllRecords(filters);
  }

  /**
   * GET /quality/records/:id
   * Get quality record by ID with exceptions
   */
  @ApiOperation({ summary: 'Get quality record by ID with exceptions' })
  @Get('records/:id')
  async getRecordById(@Param('id', ParseIntPipe) id: number) {
    return this.qualityService.getRecordById(id);
  }

  /**
   * POST /quality/records
   * Create new quality control record
   */
  @ApiOperation({ summary: 'Create new quality control record' })
  @Post('records')
  @LogActivity({
    module: 'quality',
    action: 'create',
    entity: 'QualityRecord',
    description: 'Creazione record controllo qualità',
  })
  async createRecord(@Body() data: CreateRecordDto, @Request() req) {
    return this.qualityService.createRecord(data);
  }

  /**
   * POST /quality/check-cartellino
   * Verify if cartellino exists in CoreData
   */
  @ApiOperation({ summary: 'Verify if cartellino exists in CoreData' })
  @Post('check-cartellino')
  async checkCartellino(@Body() body: { numeroCartellino: string }) {
    return this.qualityService.checkCartellino(body.numeroCartellino);
  }

  /**
   * POST /quality/check-commessa
   * Verify if commessa exists in CoreData
   */
  @ApiOperation({ summary: 'Verify if commessa exists in CoreData' })
  @Post('check-commessa')
  async checkCommessa(@Body() body: { commessa: string }) {
    return this.qualityService.checkCommessa(body.commessa);
  }

  // ==================== OPERATOR SUMMARY ====================

  /**
   * GET /quality/operator-summary
   * Get operator daily summary
   */
  @ApiOperation({ summary: 'Get operator daily summary' })
  @Get('operator-summary')
  async getOperatorDailySummary(
    @Query('operatore') operatore: string,
    @Query('date') date: string
  ) {
    return this.qualityService.getOperatorDailySummary(operatore, date);
  }

  // ==================== UTILITIES ====================

  /**
   * GET /quality/unique-operators
   * Get list of unique operators from records

   */
  @ApiOperation({ summary: 'Recupera unique-operators' })
  @Get('unique-operators')
  async getUniqueOperators() {
    return this.qualityService.getUniqueOperators();
  }

  /**
   * GET /quality/defect-categories
   * Get list of defect categories
   */
  @ApiOperation({ summary: 'Get list of defect categories' })
  @Get('defect-categories')
  async getDefectCategories() {
    return this.qualityService.getDefectCategories();
  }

  /**
   * GET /quality/options
   * Get all options for dropdowns (departments, defects, etc.)
   */
  @ApiOperation({ summary: 'Get all options for dropdowns (departments, defects, etc.)' })
  @Get('options')
  async getOptions() {
    const [departments, defectTypes, categories] = await Promise.all([
      this.qualityService.getActiveDepartments(),
      this.qualityService.getActiveDefectTypes(),
      this.qualityService.getDefectCategories(),
    ]);

    return {
      departments,
      defectTypes,
      categories,
    };
  }

  // ==================== REPORTS ====================

  /**
   * GET /quality/reports/statistics
   * Get report statistics with filters
   */
  @ApiOperation({ summary: 'Get report statistics with filters' })
  @Get('reports/statistics')
  async getReportStatistics(@Query() filters: FilterRecordsDto) {
    return this.qualityService.getReportStatistics(filters);
  }

  /**
   * POST /quality/reports/generate-pdf
   * Generate quality PDF report
   * Uses job queue system
   */
  @ApiOperation({ summary: 'Generate quality PDF report' })
  @Post('reports/generate-pdf')
  @LogActivity({
    module: 'quality',
    action: 'generate_report',
    entity: 'QualityReport',
    description: 'Generazione report PDF controllo qualità',
  })
  async generatePdfReport(@Body() filters: FilterRecordsDto, @Request() req) {
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      throw new Error('Utente non autenticato');
    }

    // Enqueue job for PDF generation
    const job = await this.jobsQueueService.enqueue('quality.report-pdf', filters as any, userId);

    return {
      success: true,
      jobId: job.id,
      message: 'Il lavoro è stato messo in coda.',
    };
  }
}
