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
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TrackingService } from './tracking.service';

@Controller('tracking')
@UseGuards(JwtAuthGuard)
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

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
  async updateLot(
    @Param('id') id: string,
    @Body() body: { lot: string },
  ) {
    return this.trackingService.updateLot(parseInt(id), body.lot);
  }

  @Delete('delete-lot/:id')
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
  async updateOrderInfo(@Body() body: { ordine: string; date?: string }) {
    return this.trackingService.updateOrderInfo(
      body.ordine,
      body.date ? new Date(body.date) : undefined,
    );
  }

  @Post('update-sku')
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

  // ==================== REPORTS (placeholder) ====================
  @Post('report-lot-pdf')
  async reportLotPdf(@Body() body: { lots: string[] }, @Res() res: Response) {
    // TODO: Implementare generazione PDF
    res.json({ message: 'PDF generation not implemented yet' });
  }

  @Post('report-cartel-pdf')
  async reportCartelPdf(@Body() body: { cartelli: number[] }, @Res() res: Response) {
    // TODO: Implementare generazione PDF
    res.json({ message: 'PDF generation not implemented yet' });
  }

  @Post('report-lot-excel')
  async reportLotExcel(@Body() body: { lots: string[] }, @Res() res: Response) {
    // TODO: Implementare generazione Excel
    res.json({ message: 'Excel generation not implemented yet' });
  }

  @Post('report-cartel-excel')
  async reportCartelExcel(@Body() body: { cartelli: number[] }, @Res() res: Response) {
    // TODO: Implementare generazione Excel
    res.json({ message: 'Excel generation not implemented yet' });
  }

  @Post('report-fiches-pdf')
  async reportFichesPdf(@Body() body: { cartelli: number[] }, @Res() res: Response) {
    // TODO: Implementare generazione Fiches PDF
    res.json({ message: 'Fiches PDF generation not implemented yet' });
  }
}
