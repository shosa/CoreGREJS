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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { LogActivity } from '../../common/decorators/log-activity.decorator';
import { ProduzioneService } from './produzione.service';
import { JobsQueueService } from '../jobs/jobs.queue';
import { JobsService } from '../jobs/jobs.service';
import { EmailService } from '../email/email.service';

@ApiTags('Produzione')
@ApiBearerAuth()
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

  @Get('phases')
  @ApiOperation({ summary: 'Lista fasi produzione', description: 'Recupera tutte le fasi di produzione configurate' })
  @ApiResponse({ status: 200, description: 'Lista fasi recuperata con successo' })
  @ApiResponse({ status: 401, description: 'Non autorizzato' })
  @ApiResponse({ status: 403, description: 'Permesso "produzione" richiesto' })
  async getAllPhases() {
    return this.produzioneService.getAllPhases();
  }

  @Get('phases/:id')
  @ApiOperation({ summary: 'Dettagli fase produzione', description: 'Recupera i dettagli di una fase specifica' })
  @ApiParam({ name: 'id', type: 'number', description: 'ID della fase', example: 1 })
  @ApiResponse({ status: 200, description: 'Fase recuperata con successo' })
  @ApiResponse({ status: 404, description: 'Fase non trovata' })
  @ApiResponse({ status: 401, description: 'Non autorizzato' })
  async getPhaseById(@Param('id') id: string) {
    return this.produzioneService.getPhaseById(parseInt(id));
  }

  @Post('phases')
  @ApiOperation({ summary: 'Crea fase produzione', description: 'Crea una nuova fase di produzione' })
  @ApiBody({
    description: 'Dati della nuova fase',
    schema: {
      type: 'object',
      properties: {
        nome: { type: 'string', example: 'Taglio' },
        ordine: { type: 'number', example: 1 },
        attivo: { type: 'boolean', example: true }
      },
      required: ['nome', 'ordine']
    }
  })
  @ApiResponse({ status: 201, description: 'Fase creata con successo' })
  @ApiResponse({ status: 400, description: 'Dati non validi' })
  @ApiResponse({ status: 401, description: 'Non autorizzato' })
  @LogActivity({ module: 'produzione', action: 'create', entity: 'ProductionPhase', description: 'Creazione nuova fase produzione' })
  async createPhase(@Body() data: any) {
    return this.produzioneService.createPhase(data);
  }

  @Put('phases/:id')
  @ApiOperation({ summary: 'Aggiorna fase produzione', description: 'Aggiorna i dati di una fase esistente' })
  @ApiParam({ name: 'id', type: 'number', description: 'ID della fase', example: 1 })
  @ApiBody({
    description: 'Dati aggiornati della fase',
    schema: {
      type: 'object',
      properties: {
        nome: { type: 'string', example: 'Taglio Laser' },
        ordine: { type: 'number', example: 1 },
        attivo: { type: 'boolean', example: true }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Fase aggiornata con successo' })
  @ApiResponse({ status: 404, description: 'Fase non trovata' })
  @ApiResponse({ status: 401, description: 'Non autorizzato' })
  @LogActivity({ module: 'produzione', action: 'update', entity: 'ProductionPhase', description: 'Aggiornamento fase produzione' })
  async updatePhase(@Param('id') id: string, @Body() data: any) {
    return this.produzioneService.updatePhase(parseInt(id), data);
  }

  @Delete('phases/:id')
  @ApiOperation({ summary: 'Elimina fase produzione', description: 'Elimina una fase di produzione' })
  @ApiParam({ name: 'id', type: 'number', description: 'ID della fase', example: 1 })
  @ApiResponse({ status: 200, description: 'Fase eliminata con successo' })
  @ApiResponse({ status: 404, description: 'Fase non trovata' })
  @ApiResponse({ status: 409, description: 'Impossibile eliminare - fase in uso' })
  @ApiResponse({ status: 401, description: 'Non autorizzato' })
  @LogActivity({ module: 'produzione', action: 'delete', entity: 'ProductionPhase', description: 'Eliminazione fase produzione' })
  async deletePhase(@Param('id') id: string) {
    return this.produzioneService.deletePhase(parseInt(id));
  }

  // ==================== DEPARTMENTS ====================

  @Get('departments')
  @ApiOperation({ summary: 'Lista reparti produzione', description: 'Recupera tutti i reparti di produzione' })
  @ApiResponse({ status: 200, description: 'Lista reparti recuperata con successo' })
  @ApiResponse({ status: 401, description: 'Non autorizzato' })
  async getAllDepartments() {
    return this.produzioneService.getAllDepartments();
  }

  @Get('departments/:id')
  @ApiOperation({ summary: 'Dettagli reparto', description: 'Recupera i dettagli di un reparto specifico' })
  @ApiParam({ name: 'id', type: 'number', description: 'ID del reparto', example: 1 })
  @ApiResponse({ status: 200, description: 'Reparto recuperato con successo' })
  @ApiResponse({ status: 404, description: 'Reparto non trovato' })
  @ApiResponse({ status: 401, description: 'Non autorizzato' })
  async getDepartmentById(@Param('id') id: string) {
    return this.produzioneService.getDepartmentById(parseInt(id));
  }

  @Post('departments')
  @ApiOperation({ summary: 'Crea reparto', description: 'Crea un nuovo reparto di produzione' })
  @ApiBody({
    description: 'Dati del nuovo reparto',
    schema: {
      type: 'object',
      properties: {
        nome: { type: 'string', example: 'Reparto A' },
        descrizione: { type: 'string', example: 'Reparto taglio' },
        attivo: { type: 'boolean', example: true }
      },
      required: ['nome']
    }
  })
  @ApiResponse({ status: 201, description: 'Reparto creato con successo' })
  @ApiResponse({ status: 400, description: 'Dati non validi' })
  @ApiResponse({ status: 401, description: 'Non autorizzato' })
  async createDepartment(@Body() data: any) {
    return this.produzioneService.createDepartment(data);
  }

  @Put('departments/:id')
  @ApiOperation({ summary: 'Aggiorna reparto', description: 'Aggiorna i dati di un reparto esistente' })
  @ApiParam({ name: 'id', type: 'number', description: 'ID del reparto', example: 1 })
  @ApiBody({
    description: 'Dati aggiornati del reparto',
    schema: {
      type: 'object',
      properties: {
        nome: { type: 'string', example: 'Reparto A - Aggiornato' },
        descrizione: { type: 'string', example: 'Reparto taglio e cucitura' },
        attivo: { type: 'boolean', example: true }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Reparto aggiornato con successo' })
  @ApiResponse({ status: 404, description: 'Reparto non trovato' })
  @ApiResponse({ status: 401, description: 'Non autorizzato' })
  async updateDepartment(@Param('id') id: string, @Body() data: any) {
    return this.produzioneService.updateDepartment(parseInt(id), data);
  }

  @Delete('departments/:id')
  @ApiOperation({ summary: 'Elimina reparto', description: 'Elimina un reparto di produzione' })
  @ApiParam({ name: 'id', type: 'number', description: 'ID del reparto', example: 1 })
  @ApiResponse({ status: 200, description: 'Reparto eliminato con successo' })
  @ApiResponse({ status: 404, description: 'Reparto non trovato' })
  @ApiResponse({ status: 409, description: 'Impossibile eliminare - reparto in uso' })
  @ApiResponse({ status: 401, description: 'Non autorizzato' })
  async deleteDepartment(@Param('id') id: string) {
    return this.produzioneService.deleteDepartment(parseInt(id));
  }

  // ==================== CALENDAR & DATA ====================

  @Get('recent')
  @ApiOperation({ summary: 'Record produzione recenti', description: 'Recupera gli ultimi N record di produzione' })
  @ApiQuery({ name: 'limit', required: false, type: 'number', description: 'Numero massimo di record', example: 15 })
  @ApiResponse({ status: 200, description: 'Record recuperati con successo' })
  @ApiResponse({ status: 401, description: 'Non autorizzato' })
  async getRecentRecords(@Query('limit') limit: string) {
    const numLimit = limit ? parseInt(limit) : 15;
    return this.produzioneService.getRecentRecords(numLimit);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Calendario produzione mensile', description: 'Recupera i dati di produzione per un mese specifico' })
  @ApiQuery({ name: 'month', required: true, type: 'number', description: 'Mese (1-12)', example: 1 })
  @ApiQuery({ name: 'year', required: true, type: 'number', description: 'Anno (YYYY)', example: 2025 })
  @ApiResponse({ status: 200, description: 'Calendario recuperato con successo' })
  @ApiResponse({ status: 400, description: 'Parametri non validi' })
  @ApiResponse({ status: 401, description: 'Non autorizzato' })
  async getCalendar(
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const now = new Date();
    const m = month ? parseInt(month) : now.getMonth() + 1;
    const y = year ? parseInt(year) : now.getFullYear();
    return this.produzioneService.getCalendarData(m, y);
  }

  @Get('today')
  @ApiOperation({ summary: 'Statistiche produzione oggi', description: 'Recupera le statistiche di produzione del giorno corrente' })
  @ApiResponse({ status: 200, description: 'Statistiche recuperate con successo' })
  @ApiResponse({ status: 401, description: 'Non autorizzato' })
  async getToday() {
    return this.produzioneService.getTodayStats();
  }

  @Get('week')
  @ApiOperation({ summary: 'Statistiche produzione settimana', description: 'Recupera le statistiche della settimana corrente' })
  @ApiResponse({ status: 200, description: 'Statistiche recuperate con successo' })
  @ApiResponse({ status: 401, description: 'Non autorizzato' })
  async getWeek() {
    return this.produzioneService.getWeekStats();
  }

  @Get('month')
  @ApiOperation({ summary: 'Statistiche produzione mese', description: 'Recupera le statistiche di un mese specifico' })
  @ApiQuery({ name: 'month', required: false, type: 'number', description: 'Mese (1-12)', example: 1 })
  @ApiQuery({ name: 'year', required: false, type: 'number', description: 'Anno (YYYY)', example: 2025 })
  @ApiResponse({ status: 200, description: 'Statistiche recuperate con successo' })
  @ApiResponse({ status: 401, description: 'Non autorizzato' })
  async getMonth(
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const m = month ? parseInt(month) : undefined;
    const y = year ? parseInt(year) : undefined;
    return this.produzioneService.getMonthStats(m, y);
  }

  @Get('trend')
  @ApiOperation({ summary: 'Trend produzione', description: 'Recupera il trend di produzione per gli ultimi N giorni' })
  @ApiQuery({ name: 'days', required: false, type: 'number', description: 'Numero di giorni', example: 30 })
  @ApiResponse({ status: 200, description: 'Trend recuperato con successo' })
  @ApiResponse({ status: 401, description: 'Non autorizzato' })
  async getTrend(@Query('days') days: string) {
    const numDays = days ? parseInt(days) : 30;
    return this.produzioneService.getTrendData(numDays);
  }

  @Get('machine-performance')
  @ApiOperation({ summary: 'Performance macchine', description: 'Recupera le performance delle macchine in un periodo' })
  @ApiQuery({ name: 'startDate', required: false, type: 'string', description: 'Data inizio (YYYY-MM-DD)', example: '2025-01-01' })
  @ApiQuery({ name: 'endDate', required: false, type: 'string', description: 'Data fine (YYYY-MM-DD)', example: '2025-01-31' })
  @ApiResponse({ status: 200, description: 'Performance recuperate con successo' })
  @ApiResponse({ status: 401, description: 'Non autorizzato' })
  async getMachinePerformance(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.produzioneService.getMachinePerformance(startDate, endDate);
  }

  @Get('comparison')
  @ApiOperation({ summary: 'Confronto periodi produzione', description: 'Confronta i dati di produzione tra due periodi' })
  @ApiQuery({ name: 'month1', required: false, type: 'number', description: 'Mese periodo 1', example: 12 })
  @ApiQuery({ name: 'year1', required: false, type: 'number', description: 'Anno periodo 1', example: 2024 })
  @ApiQuery({ name: 'month2', required: false, type: 'number', description: 'Mese periodo 2', example: 1 })
  @ApiQuery({ name: 'year2', required: false, type: 'number', description: 'Anno periodo 2', example: 2025 })
  @ApiResponse({ status: 200, description: 'Confronto completato con successo' })
  @ApiResponse({ status: 401, description: 'Non autorizzato' })
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

  @Get('pdf/:date')
  @ApiOperation({ summary: 'Genera report PDF produzione', description: 'Enqueue job asincrono per generare report PDF per una data specifica' })
  @ApiParam({ name: 'date', type: 'string', description: 'Data (YYYY-MM-DD)', example: '2025-01-15' })
  @ApiResponse({ status: 202, description: 'Job enqueued con successo' })
  @ApiResponse({ status: 400, description: 'Data non valida' })
  @ApiResponse({ status: 401, description: 'Non autorizzato' })
  async generatePdf(@Param('date') date: string, @Request() req: any) {
    const userId = req.user?.userId || req.user?.id;
    const job = await this.jobsQueueService.enqueue('prod.report-pdf', { date }, userId);
    return { jobId: job.id, status: job.status };
  }

  @Post('email/:date')
  @ApiOperation({ summary: 'Invia report PDF via email', description: 'Genera e invia report PDF produzione via email' })
  @ApiParam({ name: 'date', type: 'string', description: 'Data (YYYY-MM-DD)', example: '2025-01-15' })
  @ApiResponse({ status: 200, description: 'Email inviata con successo' })
  @ApiResponse({ status: 400, description: 'Errore nella generazione o invio' })
  @ApiResponse({ status: 401, description: 'Non autorizzato' })
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

  @Get('date/:date')
  @ApiOperation({ summary: 'Dati produzione per data', description: 'Recupera i dati di produzione per una data specifica' })
  @ApiParam({ name: 'date', type: 'string', description: 'Data (YYYY-MM-DD)', example: '2025-01-15' })
  @ApiResponse({ status: 200, description: 'Dati recuperati con successo' })
  @ApiResponse({ status: 404, description: 'Dati non trovati per questa data' })
  @ApiResponse({ status: 401, description: 'Non autorizzato' })
  async getByDate(@Param('date') date: string) {
    return this.produzioneService.getByDate(date);
  }

  @Post('date/:date')
  @ApiOperation({ summary: 'Salva dati produzione giornaliera', description: 'Crea o aggiorna i dati di produzione per una data specifica' })
  @ApiParam({ name: 'date', type: 'string', description: 'Data (YYYY-MM-DD)', example: '2025-01-15' })
  @ApiBody({
    description: 'Dati produzione giornaliera',
    schema: {
      type: 'object',
      properties: {
        departments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              departmentId: { type: 'number', example: 1 },
              phases: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    phaseId: { type: 'number', example: 1 },
                    produced: { type: 'number', example: 500 },
                    target: { type: 'number', example: 600 }
                  }
                }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Dati salvati con successo' })
  @ApiResponse({ status: 400, description: 'Dati non validi' })
  @ApiResponse({ status: 401, description: 'Non autorizzato' })
  @LogActivity({ module: 'produzione', action: 'upsert', entity: 'ProductionRecord', description: 'Registrazione/aggiornamento produzione giornaliera' })
  async upsertByDate(
    @Param('date') date: string,
    @Body() data: any,
    @Request() req,
  ) {
    const userId = req.user?.userId || req.user?.id;
    return this.produzioneService.upsert(date, data, userId);
  }

  @Put('date/:date')
  @ApiOperation({ summary: 'Aggiorna dati produzione giornaliera', description: 'Alias per POST - aggiorna i dati di produzione' })
  @ApiParam({ name: 'date', type: 'string', description: 'Data (YYYY-MM-DD)', example: '2025-01-15' })
  @ApiResponse({ status: 200, description: 'Dati aggiornati con successo' })
  @ApiResponse({ status: 401, description: 'Non autorizzato' })
  async updateByDate(
    @Param('date') date: string,
    @Body() data: any,
    @Request() req,
  ) {
    const userId = req.user?.userId || req.user?.id;
    return this.produzioneService.upsert(date, data, userId);
  }

  // ==================== CSV REPORT ====================

  @Post('process-csv')
  @UseInterceptors(FileInterceptor('csvFile'))
  @ApiOperation({ summary: 'Upload e processa CSV produzione', description: 'Carica un file CSV con dati produzione e lo processa' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File CSV da processare',
    schema: {
      type: 'object',
      properties: {
        csvFile: {
          type: 'string',
          format: 'binary',
          description: 'File CSV produzione'
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'CSV processato con successo' })
  @ApiResponse({ status: 400, description: 'File non valido o mancante' })
  @ApiResponse({ status: 401, description: 'Non autorizzato' })
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

  @Post('generate-csv-report')
  @ApiOperation({ summary: 'Genera report PDF da CSV', description: 'Genera report PDF dai dati CSV processati' })
  @ApiBody({
    description: 'Dati CSV per report',
    schema: {
      type: 'object',
      properties: {
        csvData: {
          type: 'array',
          items: { type: 'object' }
        }
      },
      required: ['csvData']
    }
  })
  @ApiResponse({ status: 202, description: 'Job report enqueued con successo' })
  @ApiResponse({ status: 400, description: 'Dati CSV non presenti' })
  @ApiResponse({ status: 401, description: 'Non autorizzato' })
  @LogActivity({ module: 'produzione', action: 'generate_csv_report', entity: 'CSV', description: 'Generazione report PDF da CSV' })
  async generateCsvReport(@Body() body: { csvData: any[] }, @Request() req) {
    const userId = req.user?.userId || req.user?.id;

    if (!body.csvData || body.csvData.length === 0) {
      throw new BadRequestException('Dati CSV non presenti');
    }

    return this.jobsQueueService.enqueue('prod.csv-report-pdf', { csvData: body.csvData }, userId);
  }
}
