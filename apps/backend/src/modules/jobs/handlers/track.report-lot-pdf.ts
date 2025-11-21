import PDFDocument = require('pdfkit');
import { JobHandler } from '../types';
import * as fs from 'fs';

const handler: JobHandler = async (payload, helpers) => {
  const { lots = [], userId, jobId } = payload as { lots: string[]; userId: number; jobId: string };
  const { trackingService, ensureOutputPath, waitForPdf } = helpers;

  const { grouped } = await trackingService.getReportDataByLots(lots);
  const fileName = `packing_list_lotti_${new Date().toISOString().split('T')[0]}.pdf`;
  const { fullPath } = await ensureOutputPath(userId, jobId, fileName);

  const doc = new PDFDocument({ margin: 20, size: 'A4' });
  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colWidth = usableWidth / 3;
  const startX = doc.page.margins.left;
  const ensureSpace = (needed = 40) => {
    if (doc.y + needed > doc.page.height - doc.page.margins.bottom) doc.addPage();
  };

  doc.fillColor('#0066cc').fontSize(16).font('Helvetica-Bold')
    .text('PACKING LIST - Dettaglio per Lotto', startX, doc.y, { align: 'left' });
  doc.moveDown();

  for (const [descrizione, types] of Object.entries(grouped)) {
    ensureSpace(30);
    doc.fillColor('#333333').fontSize(12).font('Helvetica-Bold')
      .text(descrizione, startX, doc.y);
    doc.moveDown(0.4);

    for (const [typeName, lotsByType] of Object.entries(types as Record<string, any>)) {
      ensureSpace(24);
      doc.fillColor('#666666').fontSize(10).font('Helvetica')
        .text(`Tipo: ${typeName}`, startX, doc.y);
      doc.moveDown(0.3);

      for (const [lot, details] of Object.entries(lotsByType as Record<string, any[]>)) {
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

  await waitForPdf(doc, fullPath);
  const stat = fs.statSync(fullPath);
  return { outputPath: fullPath, outputName: fileName, outputMime: 'application/pdf', outputSize: Number(stat.size) };
};

export default handler;
