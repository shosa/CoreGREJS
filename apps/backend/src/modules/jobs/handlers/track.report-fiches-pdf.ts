import PDFDocument = require('pdfkit');
import * as fs from 'fs';
import { JobHandler } from '../types';

const handler: JobHandler = async (payload, helpers) => {
  const { cartelli = [], userId, jobId } = payload as { cartelli: number[]; userId: number; jobId: string };
  const { trackingService, ensureOutputPath, waitForPdf } = helpers;

  const { groupedByCartel } = await trackingService.getReportDataByCartellini(cartelli);
  const fileName = `fiches_${new Date().toISOString().split('T')[0]}.pdf`;
  const { fullPath } = await ensureOutputPath(userId, jobId, fileName);

  const doc = new PDFDocument({ margin: 30, size: 'A4' });

  groupedByCartel.forEach((item, index) => {
    if (index > 0) doc.addPage();

    doc.rect(30, 30, 535, 80).stroke();
    doc.fillColor('#0066cc').fontSize(20).font('Helvetica-Bold')
      .text(`CARTELLINO: ${item.cartel}`, 40, 45);
    doc.fillColor('#333333').fontSize(12).font('Helvetica')
      .text(`Commessa: ${item.commessa || '-'}`, 40, 75)
      .text(`Paia: ${item.paia || 0}`, 300, 75)
      .text(`Articolo: ${item.articolo || '-'}`, 40, 95);

    doc.moveDown(2);
    doc.fillColor('#666666').fontSize(10)
      .text(`Descrizione: ${item.descrizione || '-'}`, 40);

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

  await waitForPdf(doc, fullPath);
  const stat = fs.statSync(fullPath);
  return { outputPath: fullPath, outputName: fileName, outputMime: 'application/pdf', outputSize: Number(stat.size) };
};

export default handler;
