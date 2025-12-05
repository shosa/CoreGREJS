import PDFDocument = require('pdfkit');
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { JobHandler } from '../types';

const prisma = new PrismaClient();

const handler: JobHandler = async (payload, helpers) => {
  const { id, userId, jobId } = payload as { id: number; userId: number; jobId: string };
  const { ensureOutputPath, waitForPdf } = helpers;

  const rip = await prisma.riparazione.findUnique({
    where: { id },
    include: {
      numerata: true,
      laboratorio: true,
      reparto: true,
      linea: true,
    },
  });
  if (!rip) {
    throw new Error(`Riparazione ${id} non trovata`);
  }

  const fileName = `RIPARAZIONE_${rip.idRiparazione}.pdf`;
  const { fullPath } = await ensureOutputPath(userId, jobId, fileName);

  const doc = new PDFDocument({ size: 'A4', margin: 8, bufferPages: true });
  const black = '#000';
  const gray = '#333';
  const light = '#f5f5f5';

  const commessa = '-';
  const articolo = 'MOCASSINO LOAFER DONNA NERO';
  const urgenza = 'ALTA';
  const barcodeVal = rip.idRiparazione;

  // Barcode stile legacy (placeholder): rettangolo + barre finte
  doc.rect(12, 10, 120, 30).stroke(black);
  for (let i = 0; i < 30; i++) {
    const x = 12 + 4 + i * 3;
    const w = (i % 3 === 0 ? 2 : 1);
    doc.rect(x, 12, w, 24).fill(i % 2 === 0 ? black : '#fff');
  }
  doc.fillColor(black).font('Helvetica').fontSize(8).text(barcodeVal, 12, 34, { width: 120, align: 'center' });

  // Titolo
  doc.rect(140, 10, 430, 30).stroke(black);
  doc.font('Helvetica-Bold').fontSize(20).fillColor(black).text('CEDOLA DI RIPARAZIONE', 145, 18, { width: 420, align: 'center' });

  // Barra aziendale
  doc.rect(12, 42, 560, 10).fillAndStroke(gray, black);
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(8).text('CALZATURIFICIO EMMEGIEMME SHOES S.R.L.', 12, 43, {
    width: 560,
    align: 'center',
  });

  // Box info principali
  let y = 56;
  doc.rect(12, y, 560, 86).stroke(black);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(black);
  doc.text('LABORATORIO:', 16, y + 6);
  doc.text('REPARTO:', 320, y + 6);
  doc.font('Helvetica-Bold').fontSize(18).text((rip.laboratorio?.nome || '').toUpperCase(), 16, y + 18);
  doc.font('Helvetica-Bold').fontSize(14).text((rip.reparto?.nome || '-').toUpperCase(), 320, y + 20);

  doc.font('Helvetica-Bold').fontSize(9);
  doc.text('CARTELLINO:', 16, y + 44);
  doc.text('COMMESSA:', 160, y + 44);
  doc.text('QTA:', 300, y + 44);
  doc.text('LINEA:', 360, y + 44);
  doc.text('URGENZA:', 430, y + 44);

  doc.font('Helvetica-Bold').fontSize(12);
  doc.text(String(rip.cartellino || '-'), 16, y + 58);
  doc.text(commessa, 160, y + 58);
  doc.text(String(rip.qtaTotale || 0), 300, y + 58);
  doc.text(rip.linea?.nome || '-', 360, y + 58);
  doc.text(urgenza, 430, y + 58);

  // Articolo banner
  doc.rect(12, y + 88, 560, 18).fillAndStroke(black, black);
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(12).text(articolo, 16, y + 92, { width: 552, align: 'center' });

  // Numerata
  let tableY = y + 112;
  doc.font('Helvetica-Bold').fontSize(10).fillColor(black).text('NUMERATA DA RIPARARE:', 12, tableY);
  tableY += 8;
  const colWidth = 27;
  const names: string[] = [];
  const qty: number[] = [];
  for (let i = 1; i <= 20; i++) {
    const nField = `n${String(i).padStart(2, '0')}` as keyof typeof rip.numerata;
    names.push(String(rip.numerata?.[nField] || `T${i}`));
    const pField = `p${String(i).padStart(2, '0')}` as keyof typeof rip;
    qty.push((rip[pField] as number) || 0);
  }

  names.forEach((n, idx) => {
    doc.rect(12 + idx * colWidth, tableY + 6, colWidth, 18).stroke(black);
    doc.font('Helvetica-Bold').fontSize(9).text(n, 12 + idx * colWidth, tableY + 10, { width: colWidth, align: 'center' });
  });
  qty.forEach((q, idx) => {
    doc.rect(12 + idx * colWidth, tableY + 24, colWidth, 18).stroke(black);
    doc.font('Helvetica-Bold').fontSize(10).text(String(q), 12 + idx * colWidth, tableY + 28, { width: colWidth, align: 'center' });
  });

  // Motivo riparazione
  let motivoY = tableY + 50;
  doc.rect(12, motivoY, 560, 96).stroke(black);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(black).text('MOTIVO RIPARAZIONE', 16, motivoY + 6);
  doc.font('Helvetica').fontSize(10).fillColor(black).text(rip.causale || '-', 16, motivoY + 20, { width: 552 });

  // URGENTE watermark
  doc.font('Helvetica-Bold').fontSize(28).fillColor('#bbbbbb').text('URGENTE', 16, motivoY + 88);

  // Codice centrale
  const codeY = motivoY + 120;
  doc.rect(12, codeY, 560, 28).stroke(black);
  doc.font('Helvetica-Bold').fontSize(13).fillColor(black).text(`${rip.idRiparazione.padEnd(12, '_')}`, 16, codeY + 8);

  // Footer info
  const footerY = codeY + 34;
  doc.font('Helvetica-Bold').fontSize(10).fillColor(gray).text('RIPARAZIONE N°:', 12, footerY);
  doc.rect(120, footerY - 4, 80, 20).stroke(black);
  doc.font('Helvetica-Bold').fontSize(13).fillColor(black).text(rip.idRiparazione, 120, footerY, { width: 80, align: 'center' });

  doc.rect(210, footerY - 4, 120, 20).stroke(black);
  doc.font('Helvetica-Bold').fontSize(13).fillColor(black).text((rip.reparto?.nome || 'TAGLIO').toUpperCase(), 210, footerY, {
    width: 120,
    align: 'center',
  });

  doc.font('Helvetica-Bold').fontSize(9).fillColor(gray).text('CEDOLA CREATA IL:', 350, footerY);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(black).text(new Date().toISOString().slice(0, 10), 460, footerY);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(gray).text('OPERATORE:', 350, footerY + 14);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(black).text('-', 430, footerY + 14);

  await waitForPdf(doc as any, fullPath);
  const stat = fs.statSync(fullPath);

  return {
    outputPath: fullPath,
    outputName: fileName,
    outputMime: 'application/pdf',
    outputSize: Number(stat.size),
  };
};

export default handler;
