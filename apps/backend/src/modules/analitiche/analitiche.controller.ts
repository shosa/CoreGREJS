import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { LogActivity } from '../../common/decorators/log-activity.decorator';
import { AnaliticheService } from './analitiche.service';
import { ExcelImportService } from './excel-import.service';
import { JobsQueueService } from '../jobs/jobs.queue';

@ApiTags('Analitiche')
@ApiBearerAuth()
@Controller('analitiche')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('analitiche')
export class AnaliticheController {
  constructor(
    private readonly analiticheService: AnaliticheService,
    private readonly excelImportService: ExcelImportService,
    private readonly jobsQueueService: JobsQueueService,
  ) {}

  // ==================== STATS ====================

  @Get('stats')
  async getStats() {
    return this.analiticheService.getStats();
  }

  // ==================== RECORDS ====================

  @Get('records')
  async getRecords(
    @Query('search') search?: string,
    @Query('tipoDocumento') tipoDocumento?: string,
    @Query('linea') linea?: string,
    @Query('dataFrom') dataFrom?: string,
    @Query('dataTo') dataTo?: string,
    @Query('prodottoEstero') prodottoEstero?: string,
    @Query('repartoId') repartoId?: string,
    @Query('importId') importId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.analiticheService.getRecords({
      search,
      tipoDocumento,
      linea,
      dataFrom,
      dataTo,
      prodottoEstero: prodottoEstero
        ? prodottoEstero === 'null'
          ? null
          : prodottoEstero === 'true'
        : undefined,
      repartoId: repartoId ? parseInt(repartoId) : undefined,
      importId: importId ? parseInt(importId) : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Get('records/:id')
  async getRecordById(@Param('id', ParseIntPipe) id: number) {
    return this.analiticheService.getRecordById(id);
  }

  @Put('records/:id')
  @LogActivity({ module: 'analitiche', action: 'update', entity: 'AnaliticaRecord' })
  async updateRecord(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    data: {
      prodottoEstero?: boolean;
      repartoId?: number | null;
      repartoFinaleId?: number | null;
      costoTaglio?: number | null;
      costoOrlatura?: number | null;
      costoStrobel?: number | null;
      altriCosti?: number | null;
      costoMontaggio?: number | null;
    }
  ) {
    return this.analiticheService.updateRecord(id, data);
  }

  @Delete('records/:id')
  @LogActivity({ module: 'analitiche', action: 'delete', entity: 'AnaliticaRecord' })
  async deleteRecord(@Param('id', ParseIntPipe) id: number) {
    return this.analiticheService.deleteRecord(id);
  }

  // ==================== REPARTI ====================

  @Get('reparti')
  async getReparti(@Query('onlyActive') onlyActive?: string) {
    return this.analiticheService.getReparti(onlyActive !== 'false');
  }

  @Get('reparti/:id')
  async getRepartoById(@Param('id', ParseIntPipe) id: number) {
    return this.analiticheService.getRepartoById(id);
  }

  @Post('reparti')
  @LogActivity({ module: 'analitiche', action: 'create', entity: 'AnaliticaReparto' })
  async createReparto(
    @Body()
    data: {
      nome: string;
      codice?: string;
      descrizione?: string;
      attivo?: boolean;
      ordine?: number;
      costiAssociati?: string[];
    }
  ) {
    return this.analiticheService.createReparto(data);
  }

  @Put('reparti/:id')
  @LogActivity({ module: 'analitiche', action: 'update', entity: 'AnaliticaReparto' })
  async updateReparto(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    data: {
      nome?: string;
      codice?: string;
      descrizione?: string;
      attivo?: boolean;
      ordine?: number;
      costiAssociati?: string[];
    }
  ) {
    return this.analiticheService.updateReparto(id, data);
  }

  @Delete('reparti/:id')
  @LogActivity({ module: 'analitiche', action: 'delete', entity: 'AnaliticaReparto' })
  async deleteReparto(@Param('id', ParseIntPipe) id: number) {
    return this.analiticheService.deleteReparto(id);
  }

  // ==================== IMPORTS ====================

  @Get('imports')
  async getImports(
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.analiticheService.getImports(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20
    );
  }

  @Get('imports/:id')
  async getImportById(@Param('id', ParseIntPipe) id: number) {
    return this.analiticheService.getImportById(id);
  }

  @Delete('imports/:id')
  @LogActivity({ module: 'analitiche', action: 'delete', entity: 'AnaliticaImport' })
  async deleteImport(@Param('id', ParseIntPipe) id: number) {
    return this.analiticheService.deleteImport(id);
  }

  // ==================== EXCEL UPLOAD ====================

  @Post('upload')
  @LogActivity({ module: 'analitiche', action: 'import', entity: 'AnaliticaImport', description: 'Import Excel file' })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadExcel(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any
  ) {
    if (!file) {
      throw new Error('Nessun file caricato');
    }

    const userId = req.user?.id;
    return this.excelImportService.processExcelFile(
      file.buffer,
      file.originalname,
      file.size,
      userId
    );
  }

  @Post('preview')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async previewExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('Nessun file caricato');
    }

    return this.excelImportService.previewExcelFile(file.buffer);
  }

  // ==================== TIPI DOCUMENTO ====================

  @Get('tipi-documento')
  async getTipiDocumento() {
    return this.analiticheService.getTipiDocumento();
  }

  // ==================== FILTRI DISTINTI ====================

  @Get('filters')
  async getDistinctFilters() {
    return this.analiticheService.getDistinctFilters();
  }

  // ==================== REPORTS ====================

  @Post('reports/pdf')
  @LogActivity({ module: 'analitiche', action: 'report', entity: 'Report', description: 'Generate PDF report' })
  async generatePdfReport(
    @Body()
    data: {
      dataFrom?: string;
      dataTo?: string;
      repartoId?: number;
      tipoDocumento?: string;
      linea?: string;
      groupBy?: 'reparto' | 'linea' | 'tipoDocumento' | 'mese';
      includeArticoliPerReparto?: boolean;
    },
    @Request() req: any
  ) {
    const userId = req.user?.userId;
    const job = await this.jobsQueueService.enqueue(
      'analitiche.report-pdf',
      {
        dataFrom: data.dataFrom,
        dataTo: data.dataTo,
        repartoId: data.repartoId,
        tipoDocumento: data.tipoDocumento,
        linea: data.linea,
        groupBy: data.groupBy || 'reparto',
        includeArticoliPerReparto: data.includeArticoliPerReparto || false,
      },
      userId
    );
    return { jobId: job.id, status: job.status };
  }

  @Post('reports/excel')
  @LogActivity({ module: 'analitiche', action: 'report', entity: 'Report', description: 'Generate Excel report' })
  async generateExcelReport(
    @Body()
    data: {
      dataFrom?: string;
      dataTo?: string;
      repartoId?: number;
      tipoDocumento?: string;
      linea?: string;
      includeDetails?: boolean;
    },
    @Request() req: any
  ) {
    const userId = req.user?.userId;
    const job = await this.jobsQueueService.enqueue(
      'analitiche.report-excel',
      {
        dataFrom: data.dataFrom,
        dataTo: data.dataTo,
        repartoId: data.repartoId,
        tipoDocumento: data.tipoDocumento,
        linea: data.linea,
        includeDetails: data.includeDetails || false,
      },
      userId
    );
    return { jobId: job.id, status: job.status };
  }
}
