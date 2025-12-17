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
  Res,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { LogActivity } from '../../common/decorators/log-activity.decorator';
import { TrackingService } from './tracking.service';
import { JobsQueueService } from '../jobs/jobs.queue';

@ApiTags('Tracking')
@ApiBearerAuth()
@Controller('tracking')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('tracking')
export class TrackingController {
  constructor(
    private readonly trackingService: TrackingService,
    private readonly jobsQueueService: JobsQueueService,
  ) {}

  // ==================== DASHBOARD ====================
  @ApiOperation({ summary: 'Recupera stats' })
  @Get('stats')
  async getStats() {
    return this.trackingService.getStats();
  }

  // ==================== TYPES ====================
  @ApiOperation({ summary: 'Recupera types' })
  @Get('types')
  async getTypes() {
    return this.trackingService.findAllTypes();
  }

  @ApiOperation({ summary: 'Crea types' })
  @Post('types')
  @LogActivity({ module: 'tracking', action: 'create', entity: 'TrackingType', description: 'Creazione nuovo tipo tracciamento' })
  async createType(@Body() body: { name: string; note?: string }) {
    return this.trackingService.createType(body.name, body.note);
  }

  // ==================== MULTISEARCH ====================
  @ApiOperation({ summary: 'Crea search-data' })
  @Post('search-data')
  async searchData(@Body() body: {
    cartellino?: string;
    commessa?: string;
    articolo?: string;
    descrizione?: string;
    linea?: string;
    ragioneSociale?: string;
    ordine?: string;
    page?: number;
    limit?: number;
  }) {
    return this.trackingService.searchData(body);
  }

  // ==================== ORDERSEARCH ====================
  @ApiOperation({ summary: 'Crea check-cartel' })
  @Post('check-cartel')
  async checkCartel(@Body() body: { cartellino: string }) {
    return this.trackingService.checkCartel(body.cartellino);
  }

  // ==================== PROCESSLINKS ====================
  @ApiOperation({ summary: 'Crea save-links' })
  @Post('save-links')
  @LogActivity({ module: 'tracking', action: 'save_links', entity: 'TrackingLink', description: 'Salvataggio collegamenti tracking' })
  async saveLinks(@Body() body: {
    typeId: number;
    lots: string[];
    cartelli: number[];
  }) {
    return this.trackingService.saveLinks(body);
  }

  @ApiOperation({ summary: 'Crea generate-links-pdf' })
  @Post('generate-links-pdf')
  @LogActivity({ module: 'tracking', action: 'generate_links_pdf', entity: 'Job', description: 'Generazione PDF report collegamenti' })
  async generateLinksPdf(
    @Body() body: {
      typeId: number;
      lots: string[];
      cartelli: number[];
    },
    @Req() req: any,
  ) {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) throw new Error('Utente non autenticato');

    const job = await this.jobsQueueService.enqueue(
      'track.links-report-pdf',
      body as any,
      userId,
    );

    return {
      success: true,
      jobId: job.id,
      message: 'Report collegamenti in generazione...',
    };
  }

  // ==================== TREEVIEW ====================
  @ApiOperation({ summary: 'Recupera tree-data' })
  @Get('tree-data')
  async getTreeData(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.trackingService.getTreeData(
      search,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 25,
    );
  }

  @ApiOperation({ summary: 'Aggiorna update-lot' })
  @Put('update-lot/:id')
  @LogActivity({ module: 'tracking', action: 'update', entity: 'TrackingLink', description: 'Modifica lotto tracking' })
  async updateLot(
    @Param('id') id: string,
    @Body() body: { lot: string },
  ) {
    return this.trackingService.updateLot(parseInt(id), body.lot);
  }

  @ApiOperation({ summary: 'Elimina delete-lot' })
  @Delete('delete-lot/:id')
  @LogActivity({ module: 'tracking', action: 'delete', entity: 'TrackingLink', description: 'Eliminazione lotto tracking' })
  async deleteLot(@Param('id') id: string) {
    return this.trackingService.deleteLink(parseInt(id));
  }

  // ==================== LOTDETAIL (3 tabs) ====================
  @ApiOperation({ summary: 'Recupera lots-without-ddt' })
  @Get('lots-without-ddt')
  async getLotsWithoutDdt(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.trackingService.getLotsWithoutDdt(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @ApiOperation({ summary: 'Recupera lots-with-ddt' })
  @Get('lots-with-ddt')
  async getLotsWithDdt(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.trackingService.getLotsWithDdt(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @ApiOperation({ summary: 'Recupera orders-without-date' })
  @Get('orders-without-date')
  async getOrdersWithoutDate(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.trackingService.getOrdersWithoutDate(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @ApiOperation({ summary: 'Recupera orders-with-date' })
  @Get('orders-with-date')
  async getOrdersWithDate(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.trackingService.getOrdersWithDate(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @ApiOperation({ summary: 'Recupera articles-without-sku' })
  @Get('articles-without-sku')
  async getArticlesWithoutSku(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.trackingService.getArticlesWithoutSku(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @ApiOperation({ summary: 'Recupera articles-with-sku' })
  @Get('articles-with-sku')
  async getArticlesWithSku(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.trackingService.getArticlesWithSku(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @ApiOperation({ summary: 'Crea update-lot-info' })
  @Post('update-lot-info')
  @LogActivity({ module: 'tracking', action: 'update_lot_info', entity: 'Lot', description: 'Aggiornamento informazioni lotto' })
  async updateLotInfo(@Body() body: {
    lot: string;
    doc?: string;
    date?: string;
    note?: string;
  }) {
    return this.trackingService.updateLotInfo(body.lot, {
      doc: body.doc,
      date: body.date ? new Date(body.date) : undefined,
      note: body.note,
    });
  }

  @ApiOperation({ summary: 'Crea update-order-info' })
  @Post('update-order-info')
  @LogActivity({ module: 'tracking', action: 'update_order_info', entity: 'Order', description: 'Aggiornamento informazioni ordine' })
  async updateOrderInfo(@Body() body: { ordine: string; date?: string }) {
    return this.trackingService.updateOrderInfo(
      body.ordine,
      body.date ? new Date(body.date) : undefined,
    );
  }

  @ApiOperation({ summary: 'Crea update-sku' })
  @Post('update-sku')
  @LogActivity({ module: 'tracking', action: 'update_sku', entity: 'Article', description: 'Aggiornamento SKU articolo' })
  async updateSku(@Body() body: { art: string; sku: string }) {
    return this.trackingService.updateSku(body.art, body.sku);
  }

  // ==================== SEARCH DETAILS ====================
  @ApiOperation({ summary: 'Recupera search-lot-details' })
  @Get('search-lot-details')
  async searchLotDetails(@Query('lot') lot: string) {
    return this.trackingService.searchLotDetails(lot);
  }

  @ApiOperation({ summary: 'Recupera search-order-details' })
  @Get('search-order-details')
  async searchOrderDetails(@Query('ordine') ordine: string) {
    return this.trackingService.searchOrderDetails(ordine);
  }

  @ApiOperation({ summary: 'Recupera search-articolo-details' })
  @Get('search-articolo-details')
  async searchArticoloDetails(@Query('art') art: string) {
    return this.trackingService.searchArticoloDetails(art);
  }

  // ==================== LOAD SUMMARY (for reports) ====================
  @ApiOperation({ summary: 'Crea load-summary' })
  @Post('load-summary')
  async loadSummary(@Body() body: { cartelli: number[] }) {
    return this.trackingService.loadSummary(body.cartelli);
  }

  // ==================== REPORTS ====================
  @ApiOperation({ summary: 'Crea report-lot-pdf' })
  @Post('report-lot-pdf')
  async reportLotPdf(@Body() body: { lots: string[] }, @Req() req: any) {
    const userId = req.user?.userId;
    const job = await this.jobsQueueService.enqueue('track.report-lot-pdf', { lots: body.lots }, userId);
    return { jobId: job.id, status: job.status };
  }

  @ApiOperation({ summary: 'Crea report-cartel-pdf' })
  @Post('report-cartel-pdf')
  async reportCartelPdf(@Body() body: { cartelli: number[] }, @Req() req: any) {
    const userId = req.user?.userId;
    const job = await this.jobsQueueService.enqueue('track.report-cartel-pdf', { cartelli: body.cartelli }, userId);
    return { jobId: job.id, status: job.status };
  }

  @ApiOperation({ summary: 'Crea report-lot-excel' })
  @Post('report-lot-excel')
  async reportLotExcel(@Body() body: { lots: string[] }, @Req() req: any) {
    const userId = req.user?.userId;
    const job = await this.jobsQueueService.enqueue('track.report-lot-excel', { lots: body.lots }, userId);
    return { jobId: job.id, status: job.status };
  }

  @ApiOperation({ summary: 'Crea report-cartel-excel' })
  @Post('report-cartel-excel')
  async reportCartelExcel(@Body() body: { cartelli: number[] }, @Req() req: any) {
    const userId = req.user?.userId;
    const job = await this.jobsQueueService.enqueue('track.report-cartel-excel', { cartelli: body.cartelli }, userId);
    return { jobId: job.id, status: job.status };
  }

  @ApiOperation({ summary: 'Crea report-fiches-pdf' })
  @Post('report-fiches-pdf')
  async reportFichesPdf(@Body() body: { cartelli: number[] }, @Req() req: any) {
    const userId = req.user?.userId;
    const job = await this.jobsQueueService.enqueue('track.report-fiches-pdf', { cartelli: body.cartelli }, userId);
    return { jobId: job.id, status: job.status };
  }
}
