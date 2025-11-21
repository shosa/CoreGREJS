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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ExportService } from './export.service';

@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private exportService: ExportService) {}

  // ==================== ARTICOLI MASTER ====================

  @Get('articles-master')
  async getAllArticlesMaster(@Query('search') search?: string) {
    return this.exportService.getAllArticlesMaster(search);
  }

  @Get('articles-master/:id')
  async getArticleMasterById(@Param('id') id: string) {
    return this.exportService.getArticleMasterById(parseInt(id));
  }

  @Get('articles-master/by-code/:code')
  async getArticleMasterByCode(@Param('code') code: string) {
    return this.exportService.getArticleMasterByCode(code);
  }

  @Post('articles-master')
  async createArticleMaster(@Body() data: {
    codiceArticolo: string;
    descrizione?: string;
    voceDoganale?: string;
    um?: string;
    prezzoUnitario?: number;
  }) {
    return this.exportService.createArticleMaster(data);
  }

  @Put('articles-master/:id')
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

  @Delete('articles-master/:id')
  async deleteArticleMaster(@Param('id') id: string) {
    return this.exportService.deleteArticleMaster(parseInt(id));
  }

  // ==================== TERZISTI ====================

  @Get('terzisti')
  async getAllTerzisti(@Query('onlyActive') onlyActive?: string) {
    return this.exportService.getAllTerzisti(onlyActive !== 'false');
  }

  @Get('terzisti/:id')
  async getTerzistaById(@Param('id') id: string) {
    return this.exportService.getTerzistaById(parseInt(id));
  }

  @Post('terzisti')
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

  @Put('terzisti/:id')
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

  @Delete('terzisti/:id')
  async deleteTerzista(@Param('id') id: string) {
    return this.exportService.deleteTerzista(parseInt(id));
  }

  // ==================== DOCUMENTI DDT ====================

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

  @Get('documents/next-progressivo')
  async getNextProgressivo() {
    const progressivo = await this.exportService.generateNextProgressivo();
    return { progressivo };
  }

  @Get('documents/:progressivo')
  async getDocumentByProgressivo(@Param('progressivo') progressivo: string) {
    return this.exportService.getDocumentByProgressivo(progressivo);
  }

  @Post('documents')
  async createDocument(@Body() data: {
    progressivo: string;
    terzistaId: number;
    data: string;
    autorizzazione?: string;
    commento?: string;
  }) {
    return this.exportService.createDocument(data);
  }

  @Put('documents/:progressivo')
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

  @Delete('documents/:progressivo')
  async deleteDocument(@Param('progressivo') progressivo: string) {
    return this.exportService.deleteDocument(progressivo);
  }

  @Post('documents/:progressivo/close')
  async closeDocument(@Param('progressivo') progressivo: string) {
    return this.exportService.closeDocument(progressivo);
  }

  @Post('documents/:progressivo/reopen')
  async reopenDocument(@Param('progressivo') progressivo: string) {
    return this.exportService.reopenDocument(progressivo);
  }

  // ==================== RIGHE DOCUMENTO ====================

  @Post('document-items')
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
  }) {
    return this.exportService.addDocumentItem(data);
  }

  @Put('document-items/:id')
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
    }
  ) {
    return this.exportService.updateDocumentItem(parseInt(id), data);
  }

  @Delete('document-items/:id')
  async deleteDocumentItem(@Param('id') id: string) {
    return this.exportService.deleteDocumentItem(parseInt(id));
  }

  // ==================== PIEDE DOCUMENTO ====================

  @Post('document-footer')
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

  @Get('document-footer/:documentoId')
  async getDocumentFooter(@Param('documentoId') documentoId: string) {
    return this.exportService.getDocumentFooter(parseInt(documentoId));
  }

  // ==================== MANCANTI ====================

  @Post('missing-data')
  async addMissingData(@Body() data: {
    documentoId: number;
    codiceArticolo: string;
    qtaMancante: number;
    descrizione?: string;
  }) {
    return this.exportService.addMissingData(data.documentoId, data);
  }

  @Get('missing-data/:documentoId')
  async getMissingDataForDocument(@Param('documentoId') documentoId: string) {
    return this.exportService.getMissingDataForDocument(parseInt(documentoId));
  }

  @Delete('missing-data/:id')
  async deleteMissingData(@Param('id') id: string) {
    return this.exportService.deleteMissingData(parseInt(id));
  }

  // ==================== LANCI ====================

  @Post('launch-data')
  async addLaunchData(@Body() data: {
    documentoId: number;
    lancio: string;
    articolo: string;
    paia: number;
    note?: string;
  }) {
    return this.exportService.addLaunchData(data.documentoId, data);
  }

  @Get('launch-data/:documentoId')
  async getLaunchDataForDocument(@Param('documentoId') documentoId: string) {
    return this.exportService.getLaunchDataForDocument(parseInt(documentoId));
  }

  @Delete('launch-data/:id')
  async deleteLaunchData(@Param('id') id: string) {
    return this.exportService.deleteLaunchData(parseInt(id));
  }
}
