import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { LogActivity } from '../../common/decorators/log-activity.decorator';
import { ExportService } from './export.service';
import { ExcelProcessorService } from './excel-processor.service';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Export')
@ApiBearerAuth()
@Controller('export')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('export')
export class ExportController {
  constructor(
    private exportService: ExportService,
    private excelProcessor: ExcelProcessorService,
    private prisma: PrismaService,
  ) {}

  // ==================== ARTICOLI MASTER ====================

  @ApiOperation({ summary: 'Recupera articles-master' })
  @Get('articles-master')
  async getAllArticlesMaster(@Query('search') search?: string) {
    return this.exportService.getAllArticlesMaster(search);
  }

  @ApiOperation({ summary: 'Recupera articles-master' })
  @Get('articles-master/:id')
  async getArticleMasterById(@Param('id') id: string) {
    return this.exportService.getArticleMasterById(parseInt(id));
  }

  @ApiOperation({ summary: 'Recupera by-code' })
  @Get('articles-master/by-code/:code')
  async getArticleMasterByCode(@Param('code') code: string) {
    return this.exportService.getArticleMasterByCode(code);
  }

  @ApiOperation({ summary: 'Crea articles-master' })
  @Post('articles-master')
  @LogActivity({ module: 'export', action: 'create', entity: 'ArticleMaster', description: 'Creazione articolo master' })
  async createArticleMaster(@Body() data: {
    codiceArticolo: string;
    descrizione?: string;
    voceDoganale?: string;
    um?: string;
    prezzoUnitario?: number;
  }) {
    return this.exportService.createArticleMaster(data);
  }

  @ApiOperation({ summary: 'Aggiorna articles-master' })
  @Put('articles-master/:id')
  @LogActivity({ module: 'export', action: 'update', entity: 'ArticleMaster', description: 'Modifica articolo master' })
  async updateArticleMaster(
    @Param('id') id: string,
    @Body() data: Partial<{
      codiceArticolo: string;
      descrizione: string;
      voceDoganale: string;
      um: string;
      prezzoUnitario: number;
    }>
  ) {
    return this.exportService.updateArticleMaster(parseInt(id), data);
  }

  @ApiOperation({ summary: 'Elimina articles-master' })
  @Delete('articles-master/:id')
  @LogActivity({ module: 'export', action: 'delete', entity: 'ArticleMaster', description: 'Eliminazione articolo master' })
  async deleteArticleMaster(@Param('id') id: string) {
    return this.exportService.deleteArticleMaster(parseInt(id));
  }

  // ==================== TERZISTI ====================

  @ApiOperation({ summary: 'Recupera terzisti' })
  @Get('terzisti')
  async getAllTerzisti(@Query('onlyActive') onlyActive?: string) {
    return this.exportService.getAllTerzisti(onlyActive !== 'false');
  }

  @ApiOperation({ summary: 'Recupera terzisti' })
  @Get('terzisti/:id')
  async getTerzistaById(@Param('id') id: string) {
    return this.exportService.getTerzistaById(parseInt(id));
  }

  @ApiOperation({ summary: 'Crea terzisti' })
  @Post('terzisti')
  @LogActivity({ module: 'export', action: 'create', entity: 'Terzista', description: 'Creazione terzista' })
  async createTerzista(@Body() data: {
    ragioneSociale: string;
    indirizzo1?: string;
    indirizzo2?: string;
    indirizzo3?: string;
    nazione?: string;
    consegna?: string;
    autorizzazione?: string;
  }) {
    return this.exportService.createTerzista(data);
  }

  @ApiOperation({ summary: 'Aggiorna terzisti' })
  @Put('terzisti/:id')
  @LogActivity({ module: 'export', action: 'update', entity: 'Terzista', description: 'Modifica terzista' })
  async updateTerzista(
    @Param('id') id: string,
    @Body() data: Partial<{
      ragioneSociale: string;
      indirizzo1: string;
      indirizzo2: string;
      indirizzo3: string;
      nazione: string;
      consegna: string;
      autorizzazione: string;
      attivo: boolean;
    }>
  ) {
    return this.exportService.updateTerzista(parseInt(id), data);
  }

  @ApiOperation({ summary: 'Elimina terzisti' })
  @Delete('terzisti/:id')
  @LogActivity({ module: 'export', action: 'delete', entity: 'Terzista', description: 'Eliminazione terzista' })
  async deleteTerzista(@Param('id') id: string) {
    return this.exportService.deleteTerzista(parseInt(id));
  }

  // ==================== DOCUMENTI DDT ====================

  @ApiOperation({ summary: 'Recupera documents' })
  @Get('documents')
  async getAllDocuments(
    @Query('stato') stato?: string,
    @Query('terzistaId') terzistaId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
  ) {
    return this.exportService.getAllDocuments({
      stato,
      terzistaId: terzistaId ? parseInt(terzistaId) : undefined,
      dateFrom,
      dateTo,
      search,
    });
  }

  @ApiOperation({ summary: 'Recupera next-progressivo' })
  @Get('documents/next-progressivo')
  async getNextProgressivo() {
    const progressivo = await this.exportService.generateNextProgressivo();
    return { progressivo };
  }

  @ApiOperation({ summary: 'Recupera documents' })
  @Get('documents/:progressivo')
  async getDocumentByProgressivo(@Param('progressivo') progressivo: string) {
    return this.exportService.getDocumentByProgressivo(progressivo);
  }

  @ApiOperation({ summary: 'Crea documents' })
  @Post('documents')
  @LogActivity({ module: 'export', action: 'create', entity: 'Document', description: 'Creazione DDT' })
  async createDocument(@Body() data: {
    progressivo: string;
    terzistaId: number;
    data: string;
    autorizzazione?: string;
    commento?: string;
  }) {
    return this.exportService.createDocument(data);
  }

  @ApiOperation({ summary: 'Aggiorna documents' })
  @Put('documents/:progressivo')
  @LogActivity({ module: 'export', action: 'update', entity: 'Document', description: 'Modifica DDT' })
  async updateDocument(
    @Param('progressivo') progressivo: string,
    @Body() data: Partial<{
      terzistaId: number;
      data: string;
      stato: string;
      autorizzazione: string;
      commento: string;
      firstBoot: boolean;
    }>
  ) {
    return this.exportService.updateDocument(progressivo, data);
  }

  @ApiOperation({ summary: 'Elimina documents' })
  @Delete('documents/:progressivo')
  @LogActivity({ module: 'export', action: 'delete', entity: 'Document', description: 'Eliminazione DDT' })
  async deleteDocument(@Param('progressivo') progressivo: string) {
    return this.exportService.deleteDocument(progressivo);
  }

  @ApiOperation({ summary: 'Crea close' })
  @Post('documents/:progressivo/close')
  @LogActivity({ module: 'export', action: 'close', entity: 'Document', description: 'Chiusura DDT' })
  async closeDocument(@Param('progressivo') progressivo: string) {
    return this.exportService.closeDocument(progressivo);
  }

  @ApiOperation({ summary: 'Crea reopen' })
  @Post('documents/:progressivo/reopen')
  @LogActivity({ module: 'export', action: 'reopen', entity: 'Document', description: 'Riapertura DDT' })
  async reopenDocument(@Param('progressivo') progressivo: string) {
    return this.exportService.reopenDocument(progressivo);
  }

  // ==================== RIGHE DOCUMENTO ====================

  @ApiOperation({ summary: 'Crea document-items' })
  @Post('document-items')
  @LogActivity({ module: 'export', action: 'create', entity: 'DocumentItem', description: 'Aggiunta riga DDT' })
  async addDocumentItem(@Body() data: {
    documentoId: number;
    articleId?: number;
    qtaOriginale: number;
    qtaReale?: number;
    codiceLibero?: string;
    descrizioneLibera?: string;
    voceLibera?: string;
    umLibera?: string;
    prezzoLibero?: number;
    isMancante?: boolean;
    rifMancante?: string;
    missingDataId?: number;
  }) {
    return this.exportService.addDocumentItem(data);
  }

  @ApiOperation({ summary: 'Aggiorna document-items' })
  @Put('document-items/:id')
  @LogActivity({ module: 'export', action: 'update', entity: 'DocumentItem', description: 'Modifica riga DDT' })
  async updateDocumentItem(
    @Param('id') id: string,
    @Body() data: {
      qtaOriginale?: number;
      qtaReale?: number;
      codiceLibero?: string;
      descrizioneLibera?: string;
      voceLibera?: string;
      umLibera?: string;
      prezzoLibero?: number;
      // Per aggiornare il master article
      descrizione?: string;
      voceDoganale?: string;
      prezzoUnitario?: number;
    }
  ) {
    return this.exportService.updateDocumentItem(parseInt(id), data);
  }

  @ApiOperation({ summary: 'Elimina document-items' })
  @Delete('document-items/:id')
  @LogActivity({ module: 'export', action: 'delete', entity: 'DocumentItem', description: 'Eliminazione riga DDT' })
  async deleteDocumentItem(@Param('id') id: string) {
    return this.exportService.deleteDocumentItem(parseInt(id));
  }

  // ==================== PIEDE DOCUMENTO ====================

  @ApiOperation({ summary: 'Crea document-footer' })
  @Post('document-footer')
  @LogActivity({ module: 'export', action: 'update', entity: 'DocumentFooter', description: 'Modifica piede DDT' })
  async upsertDocumentFooter(@Body() data: {
    documentoId: number;
    aspettoColli?: string;
    nColli?: number;
    totPesoLordo?: number;
    totPesoNetto?: number;
    trasportatore?: string;
    consegnatoPer?: string;
    vociDoganali?: Array<{ voce: string; peso: number }>;
  }) {
    return this.exportService.upsertDocumentFooter(data.documentoId, data);
  }

  @ApiOperation({ summary: 'Recupera document-footer' })
  @Get('document-footer/:documentoId')
  async getDocumentFooter(@Param('documentoId') documentoId: string) {
    return this.exportService.getDocumentFooter(parseInt(documentoId));
  }

  // ==================== MANCANTI ====================

  @ApiOperation({ summary: 'Crea missing-data' })
  @Post('missing-data')
  @LogActivity({ module: 'export', action: 'create', entity: 'MissingData', description: 'Aggiunta dati mancanti' })
  async addMissingData(@Body() data: {
    documentoId: number;
    articleId: number;
    qtaMancante: number;
  }) {
    return this.exportService.addMissingData(data.documentoId, data);
  }

  @ApiOperation({ summary: 'Recupera missing-data' })
  @Get('missing-data/:documentoId')
  async getMissingDataForDocument(@Param('documentoId') documentoId: string) {
    return this.exportService.getMissingDataForDocument(parseInt(documentoId));
  }

  @ApiOperation({ summary: 'Recupera missing-data-from-closed' })
  @Get('missing-data-from-closed/:terzistaId')
  async getMissingDataFromClosedDocuments(@Param('terzistaId') terzistaId: string) {
    return this.exportService.getMissingDataFromClosedDocuments(parseInt(terzistaId));
  }

  @ApiOperation({ summary: 'Elimina missing-data' })
  @Delete('missing-data/:id')
  @LogActivity({ module: 'export', action: 'delete', entity: 'MissingData', description: 'Eliminazione dati mancanti' })
  async deleteMissingData(@Param('id') id: string) {
    return this.exportService.deleteMissingData(parseInt(id));
  }

  // ==================== LANCI ====================

  @ApiOperation({ summary: 'Crea launch-data' })
  @Post('launch-data')
  @LogActivity({ module: 'export', action: 'create', entity: 'LaunchData', description: 'Aggiunta lanci' })
  async addLaunchData(@Body() data: {
    documentoId: number;
    lancio: string;
    articolo: string;
    paia: number;
    note?: string;
  }) {
    return this.exportService.addLaunchData(data.documentoId, data);
  }

  @ApiOperation({ summary: 'Recupera launch-data' })
  @Get('launch-data/:documentoId')
  async getLaunchDataForDocument(@Param('documentoId') documentoId: string) {
    return this.exportService.getLaunchDataForDocument(parseInt(documentoId));
  }

  @ApiOperation({ summary: 'Elimina launch-data' })
  @Delete('launch-data/:id')
  @LogActivity({ module: 'export', action: 'delete', entity: 'LaunchData', description: 'Eliminazione lanci' })
  async deleteLaunchData(@Param('id') id: string) {
    return this.exportService.deleteLaunchData(parseInt(id));
  }

  // ==================== EXCEL UPLOAD & PROCESSING ====================

  @ApiOperation({ summary: 'Crea upload-excel' })
  @Post('documents/:progressivo/upload-excel')
  @UseInterceptors(FileInterceptor('file'))
  @LogActivity({ module: 'export', action: 'upload', entity: 'Excel', description: 'Upload file Excel' })
  async uploadExcelFile(
    @Param('progressivo') progressivo: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const fileName = await this.excelProcessor.saveUploadedFile(
      file,
      progressivo,
    );
    return { success: true, fileName };
  }

  @ApiOperation({ summary: 'Recupera uploaded-files' })
  @Get('documents/:progressivo/uploaded-files')
  async getUploadedFiles(@Param('progressivo') progressivo: string) {
    return this.excelProcessor.getUploadedFiles(progressivo);
  }

  @ApiOperation({ summary: 'Crea process-excel' })
  @Post('documents/:progressivo/process-excel')
  @LogActivity({ module: 'export', action: 'process', entity: 'Excel', description: 'Elaborazione file Excel' })
  async processExcelFile(
    @Param('progressivo') progressivo: string,
    @Body() body: { fileName: string },
  ) {
    return this.excelProcessor.processExcelFile(body.fileName, progressivo);
  }

  @ApiOperation({ summary: 'Elimina uploaded-files' })
  @Delete('documents/:progressivo/uploaded-files/:fileName')
  @LogActivity({ module: 'export', action: 'delete', entity: 'Excel', description: 'Eliminazione file Excel' })
  async deleteUploadedFile(
    @Param('progressivo') progressivo: string,
    @Param('fileName') fileName: string,
  ) {
    await this.excelProcessor.deleteUploadedFile(progressivo, fileName);
    return { success: true };
  }

  @ApiOperation({ summary: 'Crea save-excel-data' })
  @Post('documents/:progressivo/save-excel-data')
  @LogActivity({ module: 'export', action: 'save', entity: 'ExcelData', description: 'Salvataggio dati Excel' })
  async saveExcelData(
    @Param('progressivo') progressivo: string,
    @Body()
    body: {
      modello: string;
      lancio: string;
      qty: number;
      tableTaglio: string[][];
      tableOrlatura: string[][];
      originalFileName: string;
    },
  ) {
    // Save processed Excel file to temp directory (like Legacy)
    const result = await this.excelProcessor.saveProcessedExcel({
      modello: body.modello,
      lancio: body.lancio,
      qty: body.qty,
      tableTaglio: body.tableTaglio,
      tableOrlatura: body.tableOrlatura,
      originalFileName: body.originalFileName,
      progressivo: progressivo,
    });

    return result;
  }

  @ApiOperation({ summary: 'Crea generate-ddt' })
  @Post('documents/:progressivo/generate-ddt')
  @LogActivity({ module: 'export', action: 'generate', entity: 'DDT', description: 'Generazione DDT da Excel' })
  async generateDDT(@Param('progressivo') progressivo: string) {
    // Generate DDT from processed Excel files

    return this.excelProcessor.generateDDT(progressivo);
  }

  // ==================== ASPETTO MERCE ====================

  @ApiOperation({ summary: 'Recupera tutti gli aspetti merce' })
  @Get('aspetto-merce')
  async getAllAspettoMerce(@Query('onlyActive') onlyActive?: string) {
    return this.exportService.getAllAspettoMerce(onlyActive !== 'false');
  }

  @ApiOperation({ summary: 'Recupera aspetto merce per ID' })
  @Get('aspetto-merce/:id')
  async getAspettoMerceById(@Param('id') id: string) {
    return this.exportService.getAspettoMerceById(parseInt(id));
  }

  @ApiOperation({ summary: 'Crea aspetto merce' })
  @Post('aspetto-merce')
  @LogActivity({ module: 'export', action: 'create', entity: 'AspettoMerce', description: 'Creazione aspetto merce' })
  async createAspettoMerce(@Body() data: {
    descrizione: string;
    codice?: string;
    ordine?: number;
  }) {
    return this.exportService.createAspettoMerce(data);
  }

  @ApiOperation({ summary: 'Aggiorna aspetto merce' })
  @Put('aspetto-merce/:id')
  @LogActivity({ module: 'export', action: 'update', entity: 'AspettoMerce', description: 'Modifica aspetto merce' })
  async updateAspettoMerce(
    @Param('id') id: string,
    @Body() data: Partial<{
      descrizione: string;
      codice: string;
      attivo: boolean;
      ordine: number;
    }>
  ) {
    return this.exportService.updateAspettoMerce(parseInt(id), data);
  }

  @ApiOperation({ summary: 'Elimina aspetto merce' })
  @Delete('aspetto-merce/:id')
  @LogActivity({ module: 'export', action: 'delete', entity: 'AspettoMerce', description: 'Eliminazione aspetto merce' })
  async deleteAspettoMerce(@Param('id') id: string) {
    return this.exportService.deleteAspettoMerce(parseInt(id));
  }

  // ==================== VETTORI ====================

  @ApiOperation({ summary: 'Recupera tutti i vettori' })
  @Get('vettori')
  async getAllVettori(@Query('onlyActive') onlyActive?: string) {
    return this.exportService.getAllVettori(onlyActive !== 'false');
  }

  @ApiOperation({ summary: 'Recupera vettore per ID' })
  @Get('vettori/:id')
  async getVettoreById(@Param('id') id: string) {
    return this.exportService.getVettoreById(parseInt(id));
  }

  @ApiOperation({ summary: 'Crea vettore' })
  @Post('vettori')
  @LogActivity({ module: 'export', action: 'create', entity: 'Vettore', description: 'Creazione vettore' })
  async createVettore(@Body() data: {
    ragioneSociale: string;
    codice?: string;
    indirizzo?: string;
    telefono?: string;
    ordine?: number;
  }) {
    return this.exportService.createVettore(data);
  }

  @ApiOperation({ summary: 'Aggiorna vettore' })
  @Put('vettori/:id')
  @LogActivity({ module: 'export', action: 'update', entity: 'Vettore', description: 'Modifica vettore' })
  async updateVettore(
    @Param('id') id: string,
    @Body() data: Partial<{
      ragioneSociale: string;
      codice: string;
      indirizzo: string;
      telefono: string;
      attivo: boolean;
      ordine: number;
    }>
  ) {
    return this.exportService.updateVettore(parseInt(id), data);
  }

  @ApiOperation({ summary: 'Elimina vettore' })
  @Delete('vettori/:id')
  @LogActivity({ module: 'export', action: 'delete', entity: 'Vettore', description: 'Eliminazione vettore' })
  async deleteVettore(@Param('id') id: string) {
    return this.exportService.deleteVettore(parseInt(id));
  }
}
