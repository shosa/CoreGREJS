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
import * as PDFDocument from 'pdfkit';
import * as ExcelJS from 'exceljs';

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

  // ==================== REPORTS ====================
  @Post('report-lot-pdf')
  async reportLotPdf(@Body() body: { lots: string[] }, @Res() res: Response) {
    const { grouped } = await this.trackingService.getReportDataByLots(body.lots);

    const doc = new PDFDocument({ margin: 20, size: 'A4' });
    const filename = `packing_list_lotti_${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = usableWidth / 3;
    const startX = doc.page.margins.left;
    const ensureSpace = (needed = 40) => {
      if (doc.y + needed > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
      }
    };

    // Title
    doc.fillColor('#0066cc').fontSize(16).font('Helvetica-Bold')
      .text('PACKING LIST - Dettaglio per Lotto', startX, doc.y, { align: 'left' });
    doc.moveDown();

    // Content (descrizione > type > lotto)
    for (const [descrizione, types] of Object.entries(grouped)) {
      ensureSpace(30);
      doc.fillColor('#333333').fontSize(12).font('Helvetica-Bold')
        .text(descrizione, startX, doc.y);
      doc.moveDown(0.4);

      for (const [typeName, lots] of Object.entries(types as Record<string, any>)) {
        ensureSpace(24);
        doc.fillColor('#666666').fontSize(10).font('Helvetica')
          .text(`Tipo: ${typeName}`, startX, doc.y);
        doc.moveDown(0.3);

        for (const [lot, details] of Object.entries(lots as Record<string, any[]>)) {
          const rowsNeeded = Math.max(1, Math.ceil((details as any[]).length / 3));
          const blockHeight = 14 + rowsNeeded * 12 + 6;
          ensureSpace(blockHeight);

          const startY = doc.y;
          doc.fillColor('#0066cc').fontSize(9).font('Helvetica-Bold');
          doc.text('Lotto', startX, startY, { width: colWidth, align: 'center' });
          doc.text(String(lot), startX + colWidth, startY, { width: colWidth, align: 'center' });
          doc.text('', startX + colWidth * 2, startY, { width: colWidth, align: 'center' });

          let currentY = startY + 12;
          doc.fillColor('#333333').fontSize(9).font('Helvetica');
          for (let i = 0; i < (details as any[]).length; i += 3) {
            const rowItems = (details as any[]).slice(i, i + 3);
            rowItems.forEach((item, idx) => {
              doc.text(`${item.cartel} / ${item.commessa || '-'}`, startX + colWidth * idx, currentY, {
                width: colWidth,
                align: 'center',
              });
            });
            currentY += 12;
          }
          doc.y = currentY + 6;
        }
      }
      doc.moveDown();
    }

    doc.end();
  }

  @Post('report-cartel-pdf')
  async reportCartelPdf(@Body() body: { cartelli: number[] }, @Res() res: Response) {
    const { groupedForPdf } = await this.trackingService.getReportDataByCartellini(body.cartelli);

    const doc = new PDFDocument({ margin: 20, size: 'A4' });
    const filename = `packing_list_cartellini_${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    const startX = doc.page.margins.left;
    const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const ensureSpace = (needed = 60) => {
      if (doc.y + needed > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
      }
    };

    // Title
    doc.fillColor('#0066cc').fontSize(16).font('Helvetica-Bold')
      .text('PACKING LIST - Dettaglio lotti di produzione per Cartellini', startX, doc.y, { align: 'left' });
    doc.moveDown();

    // Content (descrizione > commessa > cartellino)
    for (const [descrizione, commesse] of Object.entries(groupedForPdf)) {
      ensureSpace(30);
      doc.fillColor('#333333').fontSize(12).font('Helvetica-Bold')
        .text(descrizione, startX, doc.y);
      doc.moveDown(0.3);

      for (const [commessa, cartellini] of Object.entries(commesse as Record<string, any>)) {
        for (const [cartel, types] of Object.entries(cartellini as Record<string, Record<string, string[]>>)) {
          const typeNames = Object.keys(types);
          const maxRows = Math.max(1, ...typeNames.map(t => (types as Record<string, string[]>)[t].length));
          const colWidth = Math.min(70, usableWidth / Math.max(1, typeNames.length));
          const neededHeight = 18 + 12 + maxRows * 12 + 10;
          ensureSpace(neededHeight);

          // Cartellino header bar
          const barY = doc.y;
          doc.rect(startX, barY, usableWidth, 16).fill('#f0f0f0');
          doc.fillColor('#333333').fontSize(10).font('Helvetica-Bold')
            .text(`Cartellino: ${cartel} / Commessa: ${commessa || '-'}`, startX + 4, barY + 4);
          doc.y = barY + 18;

          // Type header row
          const headerY = doc.y;
          doc.fillColor('#666666').fontSize(9).font('Helvetica-Bold');
          typeNames.forEach((typeName, idx) => {
            doc.text(typeName, startX + colWidth * idx, headerY, { width: colWidth, align: 'center' });
          });
          doc.y = headerY + 12;
          doc.font('Helvetica').fontSize(9).fillColor('#333333');

          // Rows of lots
          for (let r = 0; r < maxRows; r++) {
            typeNames.forEach((typeName, idx) => {
              const lots = (types as Record<string, string[]>)[typeName] || [];
              const lotValue = lots[r] || '';
              doc.text(lotValue, startX + colWidth * idx, doc.y, { width: colWidth, align: 'center' });
            });
            doc.y += 12;
          }

          doc.moveDown(0.5);
        }
        doc.moveDown(0.5);
      }
      doc.moveDown();
    }

    doc.end();
  }

  @Post('report-lot-excel')
  async reportLotExcel(@Body() body: { lots: string[] }, @Res() res: Response) {
    const { excelData, allTypeNames } = await this.trackingService.getReportDataByLots(body.lots);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CoreGRE';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Packing List Lotti');

    // Header - IDENTICAL to Legacy: Cartellino, Data Inserimento, Riferimento Originale, Codice Articolo, Paia + types
    const fixedHeaders = ['Cartellino', 'Data Inserimento', 'Riferimento Originale', 'Codice Articolo', 'Paia'];
    const allHeaders = [...fixedHeaders, ...allTypeNames];

    // Write headers
    allHeaders.forEach((header, idx) => {
      sheet.getCell(1, idx + 1).value = header;
    });

    // Style header
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFCCCCCC' },
    };

    // Data rows
    excelData.forEach((item, rowIdx) => {
      const row = rowIdx + 2;
      sheet.getCell(row, 1).value = item.cartel;
      sheet.getCell(row, 2).value = item.dataInserimento || '';
      sheet.getCell(row, 3).value = item.riferimentoOriginale || '';
      sheet.getCell(row, 4).value = item.codiceArticolo || '';
      sheet.getCell(row, 5).value = item.paia || 0;

      // Type columns with lots
      allTypeNames.forEach((typeName, typeIdx) => {
        const lots = item.types[typeName] || [];
        sheet.getCell(row, 6 + typeIdx).value = lots.join(', ');
      });
    });

    // Auto-size columns
    sheet.columns.forEach((col, idx) => {
      col.width = idx < 5 ? [12, 15, 20, 15, 8][idx] : 20;
    });

    const filename = `packing_list_lotti_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  }

  @Post('report-cartel-excel')
  async reportCartelExcel(@Body() body: { cartelli: number[] }, @Res() res: Response) {
    const { groupedByCartel, allTypeNames } = await this.trackingService.getReportDataByCartellini(body.cartelli);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CoreGRE';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Packing List Cartellini');

    // Header - IDENTICAL to Legacy: Cartellino, Data Inserimento, Riferimento Originale, Codice Articolo, Paia + types
    const fixedHeaders = ['Cartellino', 'Data Inserimento', 'Riferimento Originale', 'Codice Articolo', 'Paia'];
    const allHeaders = [...fixedHeaders, ...allTypeNames];

    // Write headers
    allHeaders.forEach((header, idx) => {
      sheet.getCell(1, idx + 1).value = header;
    });

    // Style header
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFCCCCCC' },
    };

    // Data rows
    groupedByCartel.forEach((item, rowIdx) => {
      const row = rowIdx + 2;
      sheet.getCell(row, 1).value = item.cartel;
      sheet.getCell(row, 2).value = item.dataInserimento || '';
      sheet.getCell(row, 3).value = item.riferimentoOriginale || '';
      sheet.getCell(row, 4).value = item.codiceArticolo || '';
      sheet.getCell(row, 5).value = item.paia || 0;

      // Type columns with lots
      allTypeNames.forEach((typeName, typeIdx) => {
        const lots = item.types[typeName] || [];
        sheet.getCell(row, 6 + typeIdx).value = lots.join(', ');
      });
    });

    // Auto-size columns
    sheet.columns.forEach((col, idx) => {
      col.width = idx < 5 ? [12, 15, 20, 15, 8][idx] : 20;
    });

    const filename = `packing_list_cartellini_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  }

  @Post('report-fiches-pdf')
  async reportFichesPdf(@Body() body: { cartelli: number[] }, @Res() res: Response) {
    const { groupedByCartel } = await this.trackingService.getReportDataByCartellini(body.cartelli);

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    const filename = `fiches_${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    // One page per cartellino (fiche style)
    groupedByCartel.forEach((item, index) => {
      if (index > 0) doc.addPage();

      // Header box
      doc.rect(30, 30, 535, 80).stroke();
      doc.fillColor('#0066cc').fontSize(20).font('Helvetica-Bold')
        .text(`CARTELLINO: ${item.cartel}`, 40, 45);
      doc.fillColor('#333333').fontSize(12).font('Helvetica')
        .text(`Commessa: ${item.commessa || '-'}`, 40, 75)
        .text(`Paia: ${item.paia || 0}`, 300, 75)
        .text(`Articolo: ${item.articolo || '-'}`, 40, 95);

      // Description
      doc.moveDown(2);
      doc.fillColor('#666666').fontSize(10)
        .text(`Descrizione: ${item.descrizione || '-'}`, 40);

      // Lotti per tipo
      doc.moveDown();
      let y = doc.y + 10;

      for (const [typeName, lots] of Object.entries(item.types)) {
        doc.fillColor('#0066cc').fontSize(11).font('Helvetica-Bold')
          .text(typeName, 40, y);
        y += 15;

        doc.fillColor('#333333').fontSize(10).font('Helvetica')
          .text((lots as string[]).join('  |  '), 50, y, { width: 500 });
        y = doc.y + 10;
      }
    });

    doc.end();
  }
}
