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
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { LogActivity } from '../../common/decorators/log-activity.decorator';
import { TrackingService } from './tracking.service';
import { JobsQueueService } from '../jobs/jobs.queue';

@Controller('tracking')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('tracking')
export class TrackingController {
  constructor(
    private readonly trackingService: TrackingService,
    private readonly jobsQueueService: JobsQueueService,
  ) {}

  // ==================== DASHBOARD ====================
  @Get('stats')
  async getStats() {
    return this.trackingService.getStats();
  }

  // ==================== TYPES ====================
  @Get('types')
  async getTypes() {
    return this.trackingService.findAllTypes();
  }

  @Post('types')
  @LogActivity({ module: 'tracking', action: 'create', entity: 'TrackingType', description: 'Creazione nuovo tipo tracciamento' })
  async createType(@Body() body: { name: string; note?: string }) {
    return this.trackingService.createType(body.name, body.note);
  }

  // ==================== MULTISEARCH ====================
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
  @Post('check-cartel')
  async checkCartel(@Body() body: { cartellino: string }) {
    return this.trackingService.checkCartel(body.cartellino);
  }

  // ==================== PROCESSLINKS ====================
  @Post('save-links')
  @LogActivity({ module: 'tracking', action: 'save_links', entity: 'TrackingLink', description: 'Salvataggio collegamenti tracking' })
  async saveLinks(@Body() body: {
    typeId: number;
    lots: string[];
    cartelli: number[];
  }) {
    return this.trackingService.saveLinks(body);
  }

  // ==================== TREEVIEW ====================
  @Get('tree-data')
  async getTreeData(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.trackingService.getTreeData(
      search,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 100,
    );
  }

  @Put('update-lot/:id')
  @LogActivity({ module: 'tracking', action: 'update', entity: 'TrackingLink', description: 'Modifica lotto tracking' })
  async updateLot(
    @Param('id') id: string,
    @Body() body: { lot: string },
  ) {
    return this.trackingService.updateLot(parseInt(id), body.lot);
  }

  @Delete('delete-lot/:id')
  @LogActivity({ module: 'tracking', action: 'delete', entity: 'TrackingLink', description: 'Eliminazione lotto tracking' })
  async deleteLot(@Param('id') id: string) {
    return this.trackingService.deleteLink(parseInt(id));
  }

  // ==================== LOTDETAIL (3 tabs) ====================
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

  @Post('update-order-info')
  @LogActivity({ module: 'tracking', action: 'update_order_info', entity: 'Order', description: 'Aggiornamento informazioni ordine' })
  async updateOrderInfo(@Body() body: { ordine: string; date?: string }) {
    return this.trackingService.updateOrderInfo(
      body.ordine,
      body.date ? new Date(body.date) : undefined,
    );
  }

  @Post('update-sku')
  @LogActivity({ module: 'tracking', action: 'update_sku', entity: 'Article', description: 'Aggiornamento SKU articolo' })
  async updateSku(@Body() body: { art: string; sku: string }) {
    return this.trackingService.updateSku(body.art, body.sku);
  }

  // ==================== SEARCH DETAILS ====================
  @Get('search-lot-details')
  async searchLotDetails(@Query('lot') lot: string) {
    return this.trackingService.searchLotDetails(lot);
  }

  @Get('search-order-details')
  async searchOrderDetails(@Query('ordine') ordine: string) {
    return this.trackingService.searchOrderDetails(ordine);
  }

  @Get('search-articolo-details')
  async searchArticoloDetails(@Query('art') art: string) {
    return this.trackingService.searchArticoloDetails(art);
  }

  // ==================== LOAD SUMMARY (for reports) ====================
  @Post('load-summary')
  async loadSummary(@Body() body: { cartelli: number[] }) {
    return this.trackingService.loadSummary(body.cartelli);
  }

  // ==================== REPORTS ====================
  @Post('report-lot-pdf')
  async reportLotPdf(@Body() body: { lots: string[] }, @Req() req: any) {
    const userId = req.user?.userId;
    const job = await this.jobsQueueService.enqueue('track.report-lot-pdf', { lots: body.lots }, userId);
    return { jobId: job.id, status: job.status };
  }

  @Post('report-cartel-pdf')
  async reportCartelPdf(@Body() body: { cartelli: number[] }, @Req() req: any) {
    const userId = req.user?.userId;
    const job = await this.jobsQueueService.enqueue('track.report-cartel-pdf', { cartelli: body.cartelli }, userId);
    return { jobId: job.id, status: job.status };
  }

  @Post('report-lot-excel')
  async reportLotExcel(@Body() body: { lots: string[] }, @Req() req: any) {
    const userId = req.user?.userId;
    const job = await this.jobsQueueService.enqueue('track.report-lot-excel', { lots: body.lots }, userId);
    return { jobId: job.id, status: job.status };
  }

  @Post('report-cartel-excel')
  async reportCartelExcel(@Body() body: { cartelli: number[] }, @Req() req: any) {
    const userId = req.user?.userId;
    const job = await this.jobsQueueService.enqueue('track.report-cartel-excel', { cartelli: body.cartelli }, userId);
    return { jobId: job.id, status: job.status };
  }

  @Post('report-fiches-pdf')
  async reportFichesPdf(@Body() body: { cartelli: number[] }, @Req() req: any) {
    const userId = req.user?.userId;
    const job = await this.jobsQueueService.enqueue('track.report-fiches-pdf', { cartelli: body.cartelli }, userId);
    return { jobId: job.id, status: job.status };
  }
}
