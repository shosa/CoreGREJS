import PDFDocument = require('pdfkit');
import { JobHandler } from '../types';
import * as fs from 'fs';

const handler: JobHandler = async (payload, helpers) => {
  const { progressivo, userId, jobId } = payload as {
    progressivo: string;
    userId: number;
    jobId: string;
  };
  const { exportService, ensureOutputPath, waitForPdf } = helpers;

  // Fetch document with all related data
  const document = await exportService.getDocumentByProgressivo(progressivo);

  if (!document) {
    throw new Error(`Documento ${progressivo} non trovato`);
  }

  const fileName = `segnacolli_${progressivo}.pdf`;
  const { fullPath } = await ensureOutputPath(userId, jobId, fileName);

  const doc = new PDFDocument({
    margin: 30,
    size: 'A4',
    layout: 'portrait'
  });

  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const startX = doc.page.margins.left;

  const ensureSpace = (needed = 60) => {
    if (doc.y + needed > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
    }
  };

  // Header
  doc.fillColor('#0066cc').fontSize(18).font('Helvetica-Bold')
    .text('SEGNACOLLI', startX, doc.y, { align: 'center' });
  doc.moveDown(0.5);

  // Document info
  doc.fillColor('#333333').fontSize(11).font('Helvetica');
  doc.text(`DDT: ${document.progressivo}`, startX, doc.y);
  doc.text(`Data: ${new Date(document.data).toLocaleDateString('it-IT')}`, startX, doc.y);
  doc.text(`Terzista: ${document.terzista.ragioneSociale}`, startX, doc.y);

  if (document.terzista.indirizzo1) {
    doc.text(document.terzista.indirizzo1, startX, doc.y);
  }
  if (document.terzista.indirizzo2) {
    doc.text(document.terzista.indirizzo2, startX, doc.y);
  }
  if (document.terzista.indirizzo3) {
    doc.text(document.terzista.indirizzo3, startX, doc.y);
  }
  if (document.terzista.nazione) {
    doc.text(`Nazione: ${document.terzista.nazione}`, startX, doc.y);
  }

  doc.moveDown(1.5);

  // Footer data if available
  if (document.piede) {
    ensureSpace(80);

    doc.fillColor('#0066cc').fontSize(12).font('Helvetica-Bold')
      .text('COLLI', startX, doc.y);
    doc.moveDown(0.5);

    doc.fillColor('#333333').fontSize(10).font('Helvetica');

    if (document.piede.aspettoColli) {
      doc.text(`Aspetto: ${document.piede.aspettoColli}`, startX, doc.y);
    }
    if (document.piede.nColli) {
      doc.text(`N. Colli: ${document.piede.nColli}`, startX, doc.y);
    }
    if (document.piede.totPesoLordo) {
      doc.text(`Peso Lordo: ${Number(document.piede.totPesoLordo).toFixed(2)} kg`, startX, doc.y);
    }
    if (document.piede.totPesoNetto) {
      doc.text(`Peso Netto: ${Number(document.piede.totPesoNetto).toFixed(2)} kg`, startX, doc.y);
    }
    if (document.piede.trasportatore) {
      doc.text(`Trasportatore: ${document.piede.trasportatore}`, startX, doc.y);
    }

    doc.moveDown(1);
  }

  // Articles summary
  ensureSpace(100);

  doc.fillColor('#0066cc').fontSize(12).font('Helvetica-Bold')
    .text('ARTICOLI', startX, doc.y);
  doc.moveDown(0.5);

  // Table header
  const colWidths = [usableWidth * 0.3, usableWidth * 0.4, usableWidth * 0.15, usableWidth * 0.15];
  let currentX = startX;

  doc.fillColor('#666666').fontSize(9).font('Helvetica-Bold');
  doc.text('CODICE', currentX, doc.y, { width: colWidths[0], align: 'left' });
  currentX += colWidths[0];
  doc.text('DESCRIZIONE', currentX, doc.y, { width: colWidths[1], align: 'left' });
  currentX += colWidths[1];
  doc.text('QTA', currentX, doc.y, { width: colWidths[2], align: 'center' });
  currentX += colWidths[2];
  doc.text('UM', currentX, doc.y, { width: colWidths[3], align: 'center' });

  doc.moveDown(0.3);

  // Horizontal line
  doc.strokeColor('#cccccc').lineWidth(0.5)
    .moveTo(startX, doc.y)
    .lineTo(startX + usableWidth, doc.y)
    .stroke();

  doc.moveDown(0.3);

  // Table rows
  doc.fillColor('#333333').fontSize(9).font('Helvetica');

  for (const item of document.righe) {
    if (item.isMancante) continue; // Skip missing items

    ensureSpace(20);

    const codice = item.article?.codiceArticolo || item.codiceLibero || '-';
    const descrizione = item.article?.descrizione || item.descrizioneLibera || '-';
    const qta = item.qtaReale || item.qtaOriginale;
    const um = item.article?.um || item.umLibera || '-';

    currentX = startX;
    doc.text(codice, currentX, doc.y, { width: colWidths[0], align: 'left' });
    doc.text(descrizione, currentX + colWidths[0], doc.y, { width: colWidths[1], align: 'left' });
    doc.text(String(qta), currentX + colWidths[0] + colWidths[1], doc.y, { width: colWidths[2], align: 'center' });
    doc.text(um, currentX + colWidths[0] + colWidths[1] + colWidths[2], doc.y, { width: colWidths[3], align: 'center' });

    doc.moveDown(0.3);
  }

  // Authorization if present
  if (document.autorizzazione) {
    doc.moveDown(1);
    ensureSpace(30);
    doc.fillColor('#666666').fontSize(9).font('Helvetica-Oblique')
      .text(`Autorizzazione: ${document.autorizzazione}`, startX, doc.y, { align: 'left' });
  }

  await waitForPdf(doc, fullPath);
  const stat = fs.statSync(fullPath);

  return {
    outputPath: fullPath,
    outputName: fileName,
    outputMime: 'application/pdf',
    outputSize: Number(stat.size)
  };
};

export default handler;
