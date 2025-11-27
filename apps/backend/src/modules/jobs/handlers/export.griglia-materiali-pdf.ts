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

  const fileName = `griglia_materiali_${progressivo}.pdf`;
  const { fullPath } = await ensureOutputPath(userId, jobId, fileName);

  const doc = new PDFDocument({
    margin: 30,
    size: 'A4',
    layout: 'landscape'
  });

  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const startX = doc.page.margins.left;

  const ensureSpace = (needed = 60) => {
    if (doc.y + needed > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
    }
  };

  // Header
  doc.fillColor('#0066cc').fontSize(16).font('Helvetica-Bold')
    .text('GRIGLIA MATERIALI', startX, doc.y, { align: 'center' });
  doc.moveDown(0.5);

  // Document info
  doc.fillColor('#333333').fontSize(10).font('Helvetica');
  doc.text(`DDT: ${document.progressivo} | Data: ${new Date(document.data).toLocaleDateString('it-IT')} | Terzista: ${document.terzista.ragioneSociale}`, startX, doc.y, { align: 'center' });
  doc.moveDown(1.5);

  // Table header - wider columns for landscape
  const colWidths = [
    usableWidth * 0.15, // Codice
    usableWidth * 0.35, // Descrizione
    usableWidth * 0.12, // Voce Doganale
    usableWidth * 0.08, // UM
    usableWidth * 0.1,  // Qta Orig
    usableWidth * 0.1,  // Qta Reale
    usableWidth * 0.1   // Prezzo
  ];

  let currentX = startX;

  doc.fillColor('#0066cc').fontSize(9).font('Helvetica-Bold');
  doc.text('CODICE', currentX, doc.y, { width: colWidths[0], align: 'left' });
  currentX += colWidths[0];
  doc.text('DESCRIZIONE', currentX, doc.y, { width: colWidths[1], align: 'left' });
  currentX += colWidths[1];
  doc.text('VOCE DOG.', currentX, doc.y, { width: colWidths[2], align: 'center' });
  currentX += colWidths[2];
  doc.text('UM', currentX, doc.y, { width: colWidths[3], align: 'center' });
  currentX += colWidths[3];
  doc.text('QTA ORIG', currentX, doc.y, { width: colWidths[4], align: 'center' });
  currentX += colWidths[4];
  doc.text('QTA REALE', currentX, doc.y, { width: colWidths[5], align: 'center' });
  currentX += colWidths[5];
  doc.text('PREZZO', currentX, doc.y, { width: colWidths[6], align: 'right' });

  doc.moveDown(0.3);

  // Horizontal line
  doc.strokeColor('#0066cc').lineWidth(1)
    .moveTo(startX, doc.y)
    .lineTo(startX + usableWidth, doc.y)
    .stroke();

  doc.moveDown(0.3);

  // Table rows
  doc.fillColor('#333333').fontSize(8).font('Helvetica');

  let totalQtaOriginale = 0;
  let totalQtaReale = 0;
  let totalValue = 0;

  for (const item of document.righe) {
    if (item.isMancante) continue; // Skip missing items

    ensureSpace(18);

    const codice = item.article?.codiceArticolo || item.codiceLibero || '-';
    const descrizione = item.article?.descrizione || item.descrizioneLibera || '-';
    const voce = item.article?.voceDoganale || item.voceLibera || '-';
    const um = item.article?.um || item.umLibera || '-';
    const qtaOrig = Number(item.qtaOriginale ?? 0);
    const qtaReale = Number(item.qtaReale ?? item.qtaOriginale ?? 0);
    const prezzo = Number(item.article?.prezzoUnitario ?? item.prezzoLibero ?? 0);

    totalQtaOriginale += qtaOrig;
    totalQtaReale += qtaReale;
    totalValue += qtaReale * prezzo;

    currentX = startX;
    const rowY = doc.y;

    doc.text(codice, currentX, rowY, { width: colWidths[0], align: 'left' });
    currentX += colWidths[0];
    doc.text(descrizione, currentX, rowY, { width: colWidths[1], align: 'left' });
    currentX += colWidths[1];
    doc.text(voce, currentX, rowY, { width: colWidths[2], align: 'center' });
    currentX += colWidths[2];
    doc.text(um, currentX, rowY, { width: colWidths[3], align: 'center' });
    currentX += colWidths[3];
    doc.text(String(qtaOrig), currentX, rowY, { width: colWidths[4], align: 'center' });
    currentX += colWidths[4];
    doc.text(String(qtaReale), currentX, rowY, { width: colWidths[5], align: 'center' });
    currentX += colWidths[5];
    doc.text(`€ ${Number(prezzo).toFixed(2)}`, currentX, rowY, { width: colWidths[6], align: 'right' });

    doc.moveDown(0.3);
  }

  // Separator line
  doc.moveDown(0.3);
  doc.strokeColor('#cccccc').lineWidth(0.5)
    .moveTo(startX, doc.y)
    .lineTo(startX + usableWidth, doc.y)
    .stroke();
  doc.moveDown(0.5);

  // Totals row
  doc.fillColor('#0066cc').fontSize(9).font('Helvetica-Bold');
  currentX = startX;
  doc.text('TOTALI', currentX, doc.y, { width: colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], align: 'right' });
  currentX += colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3];
  doc.text(String(totalQtaOriginale), currentX, doc.y, { width: colWidths[4], align: 'center' });
  currentX += colWidths[4];
  doc.text(String(totalQtaReale), currentX, doc.y, { width: colWidths[5], align: 'center' });
  currentX += colWidths[5];
  doc.text(`€ ${totalValue.toFixed(2)}`, currentX, doc.y, { width: colWidths[6], align: 'right' });

  // Missing items section if any
  if (document.mancanti && document.mancanti.length > 0) {
    doc.moveDown(2);
    ensureSpace(80);

    doc.fillColor('#cc0000').fontSize(12).font('Helvetica-Bold')
      .text('ARTICOLI MANCANTI', startX, doc.y);
    doc.moveDown(0.5);

    doc.fillColor('#333333').fontSize(8).font('Helvetica');

    for (const mancante of document.mancanti) {
      ensureSpace(15);
      doc.text(`${mancante.article?.codiceArticolo || '-'}: ${mancante.article?.descrizione || '-'} - Qta: ${mancante.qtaMancante}`, startX, doc.y);
      doc.moveDown(0.2);
    }
  }

  // Customs codes section if available
  if (document.piede && document.piede.vociDoganali) {
    const voci = document.piede.vociDoganali as Array<{ voce: string; peso: number }>;

    if (voci.length > 0) {
      doc.moveDown(2);
      ensureSpace(80);

      doc.fillColor('#0066cc').fontSize(11).font('Helvetica-Bold')
        .text('VOCI DOGANALI', startX, doc.y);
      doc.moveDown(0.5);

      doc.fillColor('#333333').fontSize(8).font('Helvetica');

      // Separa SOTTOPIEDI dalle altre voci
      const sottopiedi = voci.find(v => v.voce === 'SOTTOPIEDI');
      const altreVoci = voci.filter(v => v.voce !== 'SOTTOPIEDI');

      // Stampa prima le voci normali
      for (const voceData of altreVoci) {
        ensureSpace(15);
        doc.text(`${voceData.voce}: ${voceData.peso.toFixed(2)} kg`, startX, doc.y);
        doc.moveDown(0.2);
      }

      // Stampa SOTTOPIEDI per ultimo con formato speciale
      if (sottopiedi) {
        ensureSpace(15);
        doc.text(`SOTTOPIEDI N.C. 56031480 PESO NETTO KG ${sottopiedi.peso.toFixed(2)}`, startX, doc.y);
        doc.moveDown(0.2);
      }
    }
  }

  // Launch data section if any
  if (document.lanci && document.lanci.length > 0) {
    doc.moveDown(2);
    ensureSpace(80);

    doc.fillColor('#0066cc').fontSize(11).font('Helvetica-Bold')
      .text('LANCI DI PRODUZIONE', startX, doc.y);
    doc.moveDown(0.5);

    doc.fillColor('#333333').fontSize(8).font('Helvetica');

    for (const lancio of document.lanci) {
      ensureSpace(15);
      doc.text(`Lancio ${lancio.lancio}: ${lancio.articolo} - ${lancio.paia} paia${lancio.note ? ' (' + lancio.note + ')' : ''}`, startX, doc.y);
      doc.moveDown(0.2);
    }
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
