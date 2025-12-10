import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { LogActivity } from '../../common/decorators/log-activity.decorator';
import { ProduzioneService } from './produzione.service';
import { JobsQueueService } from '../jobs/jobs.queue';
import { JobsService } from '../jobs/jobs.service';
import { EmailService } from '../email/email.service';

@Controller('produzione')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('produzione')
export class ProduzioneController {
  constructor(
    private produzioneService: ProduzioneService,
    private jobsQueueService: JobsQueueService,
    private jobsService: JobsService,
    private emailService: EmailService,
  ) {}

  // ==================== PHASES ====================

  // GET /produzione/phases
  @Get('phases')
  async getAllPhases() {
    return this.produzioneService.getAllPhases();
  }

  // GET /produzione/phases/:id
  @Get('phases/:id')
  async getPhaseById(@Param('id') id: string) {
    return this.produzioneService.getPhaseById(parseInt(id));
  }

  // POST /produzione/phases
  @Post('phases')
  @LogActivity({ module: 'produzione', action: 'create', entity: 'ProductionPhase', description: 'Creazione nuova fase produzione' })
  async createPhase(@Body() data: any) {
    return this.produzioneService.createPhase(data);
  }

  // PUT /produzione/phases/:id
  @Put('phases/:id')
  @LogActivity({ module: 'produzione', action: 'update', entity: 'ProductionPhase', description: 'Aggiornamento fase produzione' })
  async updatePhase(@Param('id') id: string, @Body() data: any) {
    return this.produzioneService.updatePhase(parseInt(id), data);
  }

  // DELETE /produzione/phases/:id
  @Delete('phases/:id')
  @LogActivity({ module: 'produzione', action: 'delete', entity: 'ProductionPhase', description: 'Eliminazione fase produzione' })
  async deletePhase(@Param('id') id: string) {
    return this.produzioneService.deletePhase(parseInt(id));
  }

  // ==================== DEPARTMENTS ====================

  // GET /produzione/departments
  @Get('departments')
  async getAllDepartments() {
    return this.produzioneService.getAllDepartments();
  }

  // GET /produzione/departments/:id
  @Get('departments/:id')
  async getDepartmentById(@Param('id') id: string) {
    return this.produzioneService.getDepartmentById(parseInt(id));
  }

  // POST /produzione/departments
  @Post('departments')
  async createDepartment(@Body() data: any) {
    return this.produzioneService.createDepartment(data);
  }

  // PUT /produzione/departments/:id
  @Put('departments/:id')
  async updateDepartment(@Param('id') id: string, @Body() data: any) {
    return this.produzioneService.updateDepartment(parseInt(id), data);
  }

  // DELETE /produzione/departments/:id
  @Delete('departments/:id')
  async deleteDepartment(@Param('id') id: string) {
    return this.produzioneService.deleteDepartment(parseInt(id));
  }

  // ==================== CALENDAR & DATA ====================

  // GET /produzione/recent?limit=15
  @Get('recent')
  async getRecentRecords(@Query('limit') limit: string) {
    const numLimit = limit ? parseInt(limit) : 15;
    return this.produzioneService.getRecentRecords(numLimit);
  }

  // GET /produzione/calendar?month=1&year=2025
  @Get('calendar')
  async getCalendar(
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const now = new Date();
    const m = month ? parseInt(month) : now.getMonth() + 1;
    const y = year ? parseInt(year) : now.getFullYear();
    return this.produzioneService.getCalendarData(m, y);
  }

  // GET /produzione/today
  @Get('today')
  async getToday() {
    return this.produzioneService.getTodayStats();
  }

  // GET /produzione/week
  @Get('week')
  async getWeek() {
    return this.produzioneService.getWeekStats();
  }

  // GET /produzione/month?month=...&year=...
  @Get('month')
  async getMonth(
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const m = month ? parseInt(month) : undefined;
    const y = year ? parseInt(year) : undefined;
    return this.produzioneService.getMonthStats(m, y);
  }

  // GET /produzione/trend?days=30
  @Get('trend')
  async getTrend(@Query('days') days: string) {
    const numDays = days ? parseInt(days) : 30;
    return this.produzioneService.getTrendData(numDays);
  }

  // GET /produzione/machine-performance?startDate=...&endDate=...
  @Get('machine-performance')
  async getMachinePerformance(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.produzioneService.getMachinePerformance(startDate, endDate);
  }

  // GET /produzione/comparison?month1=...&year1=...&month2=...&year2=...
  @Get('comparison')
  async getComparison(
    @Query('month1') month1: string,
    @Query('year1') year1: string,
    @Query('month2') month2: string,
    @Query('year2') year2: string,
  ) {
    const now = new Date();
    const m2 = month2 ? parseInt(month2) : now.getMonth() + 1;
    const y2 = year2 ? parseInt(year2) : now.getFullYear();

    // Previous month
    let m1 = month1 ? parseInt(month1) : m2 - 1;
    let y1 = year1 ? parseInt(year1) : y2;
    if (m1 === 0) {
      m1 = 12;
      y1 = y1 - 1;
    }

    return this.produzioneService.getComparison(m1, y1, m2, y2);
  }

  // GET /produzione/pdf/:date - enqueue PDF report
  @Get('pdf/:date')
  async generatePdf(@Param('date') date: string, @Request() req: any) {
    const userId = req.user?.userId || req.user?.id;
    const job = await this.jobsQueueService.enqueue('prod.report-pdf', { date }, userId);
    return { jobId: job.id, status: job.status };
  }

  // POST /produzione/email/:date - send PDF via email
  @Post('email/:date')
  @LogActivity({ module: 'produzione', action: 'send_email', entity: 'ProductionRecord', description: 'Invio email cedola produzione' })
  async sendPdfEmail(@Param('date') date: string, @Request() req: any) {
    const userId = req.user?.userId || req.user?.id;

    // Generate PDF first (enqueue job)
    const job = await this.jobsQueueService.enqueue('prod.report-pdf', { date }, userId);

    // Wait for job completion (poll status)
    let attempts = 0;
    const maxAttempts = 60; // 30 seconds max
    while (attempts < maxAttempts) {
      const jobStatus = await this.jobsService.getJob(job.id, userId);

      if (jobStatus.status === 'done' && jobStatus.outputPath) {
        // Send email with PDF
        const result = await this.emailService.sendProduzionePdf(
          date,
          jobStatus.outputPath,
          userId,
        );

        return {
          success: result.success,
          message: 'Email inviata con successo',
          jobId: job.id,
        };
      } else if (jobStatus.status === 'failed') {
        throw new BadRequestException('Errore nella generazione del PDF');
      }

      // Wait 500ms before next check
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }

    throw new BadRequestException('Timeout nella generazione del PDF');
  }

  // GET /produzione/date/:date - MUST be after all static routes
  @Get('date/:date')
  async getByDate(@Param('date') date: string) {
    return this.produzioneService.getByDate(date);
  }

  // POST /produzione/date/:date
  @Post('date/:date')
  @LogActivity({ module: 'produzione', action: 'upsert', entity: 'ProductionRecord', description: 'Registrazione/aggiornamento produzione giornaliera' })
  async upsertByDate(
    @Param('date') date: string,
    @Body() data: any,
    @Request() req,
  ) {
    const userId = req.user?.userId || req.user?.id;
    return this.produzioneService.upsert(date, data, userId);
  }

  // PUT /produzione/date/:date (alias for POST)
  @Put('date/:date')
  async updateByDate(
    @Param('date') date: string,
    @Body() data: any,
    @Request() req,
  ) {
    const userId = req.user?.userId || req.user?.id;
    return this.produzioneService.upsert(date, data, userId);
  }

  // ==================== CSV REPORT ====================

  // POST /produzione/process-csv - Upload and process CSV file
  @Post('process-csv')
  @UseInterceptors(FileInterceptor('csvFile'))
  @LogActivity({ module: 'produzione', action: 'upload_csv', entity: 'CSV', description: 'Upload e elaborazione CSV produzione' })
  async processCsv(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('File CSV non presente');
    }

    const userId = req.user?.userId || req.user?.id;
    return this.produzioneService.processCsv(file, userId);
  }

  // POST /produzione/generate-csv-report - Generate PDF report from processed CSV
  @Post('generate-csv-report')
  @LogActivity({ module: 'produzione', action: 'generate_csv_report', entity: 'CSV', description: 'Generazione report PDF da CSV' })
  async generateCsvReport(@Body() body: { csvData: any[] }, @Request() req) {
    const userId = req.user?.userId || req.user?.id;

    if (!body.csvData || body.csvData.length === 0) {
      throw new BadRequestException('Dati CSV non presenti');
    }

    return this.jobsQueueService.enqueue('prod.csv-report-pdf', { csvData: body.csvData }, userId);
  }
}
