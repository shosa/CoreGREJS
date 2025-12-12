import PDFDocument = require('pdfkit');
import { JobHandler } from '../types';
import * as fs from 'fs';

const handler: JobHandler = async (payload, helpers) => {
  const { cartelli = [], userId, jobId } = payload as { cartelli: number[]; userId: number; jobId: string };
  const { trackingService, ensureOutputPath, waitForPdf } = helpers;

  const { groupedForPdf } = await trackingService.getReportDataByCartellini(cartelli);
  const fileName = `packing_list_cartellini_${new Date().toISOString().split('T')[0]}.pdf`;
  const { fullPath } = await ensureOutputPath(userId, jobId, fileName);

  const doc = new PDFDocument({ margin: 20, size: 'A4' });
  const startX = doc.page.margins.left;
  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const ensureSpace = (needed = 60) => {
    if (doc.y + needed > doc.page.height - doc.page.margins.bottom) doc.addPage();
  };

  doc.fillColor('#0066cc').fontSize(16).font('Helvetica-Bold')
    .text('PACKING LIST - Dettaglio lotti di produzione per Cartellini', startX, doc.y, { align: 'left' });
  doc.moveDown();

  for (const [descrizione, commesse] of Object.entries(groupedForPdf)) {
    ensureSpace(30);
    doc.fillColor('#333333').fontSize(12).font('Helvetica-Bold')
      .text(descrizione, startX, doc.y);
    doc.moveDown(0.3);

    for (const [commessa, cartelliniData] of Object.entries(commesse as Record<string, any>)) {
      for (const [cartel, types] of Object.entries(cartelliniData as Record<string, Record<string, string[]>>)) {
        const typeNames = Object.keys(types);
        const maxRows = Math.max(1, ...typeNames.map(t => (types as Record<string, string[]>)[t].length));
        const colWidth = Math.min(70, usableWidth / Math.max(1, typeNames.length));
        const neededHeight = 18 + 12 + maxRows * 12 + 10;
        ensureSpace(neededHeight);

        const barY = doc.y;
        doc.rect(startX, barY, usableWidth, 16).fill('#f0f0f0');
        doc.fillColor('#333333').fontSize(10).font('Helvetica-Bold')
          .text(`Cartellino: ${cartel} / Commessa: ${commessa || '-'}`, startX + 4, barY + 4);
        doc.y = barY + 18;

        const headerY = doc.y;
        doc.fillColor('#666666').fontSize(9).font('Helvetica-Bold');
        typeNames.forEach((typeName, idx) => {
          doc.text(typeName, startX + colWidth * idx, headerY, { width: colWidth, align: 'center' });
        });
        doc.y = headerY + 12;
        doc.font('Helvetica').fontSize(9).fillColor('#333333');

        for (let r = 0; r < maxRows; r++) {
          const rowY = doc.y;
          let maxHeight = 12; // minimum height

          typeNames.forEach((typeName, idx) => {
            const lots = (types as Record<string, string[]>)[typeName] || [];
            const lotValue = lots[r] || '';
            const cellHeight = doc.heightOfString(lotValue, { width: colWidth, align: 'center' });
            maxHeight = Math.max(maxHeight, cellHeight);
            doc.text(lotValue, startX + colWidth * idx, rowY, { width: colWidth, align: 'center' });
          });

          doc.y = rowY + maxHeight + 2;
        }

        doc.moveDown(0.5);
      }
      doc.moveDown(0.5);
    }
    doc.moveDown();
  }

  await waitForPdf(doc, fullPath);
  const stat = fs.statSync(fullPath);
  return { outputPath: fullPath, outputName: fileName, outputMime: 'application/pdf', outputSize: Number(stat.size) };
};

export default handler;
