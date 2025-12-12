import PDFDocument = require('pdfkit');
import { JobHandler } from '../types';
import * as fs from 'fs';

const handler: JobHandler = async (payload, helpers) => {
  const { userId, jobId, typeId, lots, cartelli } = payload as {
    userId: number;
    jobId: string;
    typeId: number;
    lots: string[];
    cartelli: number[];
  };
  const { ensureOutputPath, trackingService } = helpers;

  const fileName = `REPORT_COLLEGAMENTI_${new Date().toISOString().split('T')[0]}.pdf`;
  const { fullPath } = await ensureOutputPath(userId, jobId, fileName);

  // Get data from trackingService methods
  const { type, cartelliDetails } = await trackingService.getLinksReportData(typeId, cartelli);

  // Create PDF
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const chunks: Buffer[] = [];

  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  doc.on('end', () => {
    const buffer = Buffer.concat(chunks);
    fs.writeFileSync(fullPath, buffer);
  });

  // Header
  doc.fontSize(16)
    .font('Helvetica-Bold')
    .text('REPORT COLLEGAMENTI TRACKING', { align: 'center' });

  doc.moveDown(0.3);
  doc.fontSize(9)
    .font('Helvetica')
    .text(new Date().toLocaleString('it-IT'), { align: 'center' });

  doc.moveDown(1);

  // Summary
  doc.fontSize(10).font('Helvetica-Bold').text('RIEPILOGO');
  doc.moveDown(0.3);
  doc.fontSize(9).font('Helvetica');
  doc.text(`Tipo Collegamento: ${type?.name || 'N/D'}`);
  if (type?.note) {
    doc.text(`Note: ${type.note}`);
  }
  doc.text(`Cartellini: ${cartelli.length}`);
  doc.text(`Lotti: ${lots.length}`);

  doc.moveDown(1);

  // Cartellini Details Section
  if (doc.y > 600) doc.addPage();

  doc.fontSize(10).font('Helvetica-Bold').text('DETTAGLIO CARTELLINI');
  doc.moveDown(0.5);

  // Table header
  const headerY = doc.y;
  doc.fontSize(8).font('Helvetica-Bold');
  doc.text('Cartellino', 40, headerY);
  doc.text('Commessa', 105, headerY);
  doc.text('Articolo', 210, headerY);
  doc.text('Descrizione', 315, headerY);

  doc.y = headerY + 12;
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.3);

  // Table rows
  doc.fontSize(8).font('Helvetica');
  cartelliDetails.forEach((cart) => {
    if (doc.y > 750) {
      doc.addPage();
      doc.y = 40;
    }

    const rowY = doc.y;

    // Calculate height needed for description (can be multi-line)
    const descText = cart.descrizioneArticolo || '-';
    const descHeight = doc.heightOfString(descText, { width: 240 });

    doc.text(String(cart.cartel) || '-', 40, rowY, { width: 60 });
    doc.text(cart.commessaCli || '-', 105, rowY, { width: 100 });
    doc.text(cart.articolo || '-', 210, rowY, { width: 100 });
    doc.text(descText, 315, rowY, { width: 240 });

    // Move to next row using the max height (description height + small padding)
    doc.y = rowY + descHeight + 4;
  });

  doc.moveDown(0.5);

  // Lotti Section
  if (doc.y > 650) doc.addPage();

  doc.fontSize(10).font('Helvetica-Bold').text('LOTTI ASSOCIATI');
  doc.moveDown(0.3);

  // Display lots in columns
  doc.fontSize(8).font('Helvetica');
  const lotsPerRow = 5;
  let lotText = '';

  lots.forEach((lot, index) => {
    lotText += lot.padEnd(25);
    if ((index + 1) % lotsPerRow === 0) {
      doc.text(lotText.trim());
      lotText = '';
    }
  });

  if (lotText.trim()) {
    doc.text(lotText.trim());
  }

  doc.end();

  // Wait for PDF to finish writing
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 100);
  });

  const stat = fs.statSync(fullPath);
  return {
    outputPath: fullPath,
    outputName: fileName,
    outputMime: 'application/pdf',
    outputSize: Number(stat.size),
  };
};

export default handler;
