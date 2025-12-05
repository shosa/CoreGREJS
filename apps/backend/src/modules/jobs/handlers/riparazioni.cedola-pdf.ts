import PDFDocument = require('pdfkit');
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { JobHandler } from '../types';

const prisma = new PrismaClient();

const handler: JobHandler = async (payload, helpers) => {
  const { id, userId, jobId } = payload as { id: number; userId: number; jobId: string };
  const { ensureOutputPath, waitForPdf } = helpers;

  // Include user relation
  const rip = await prisma.riparazione.findUnique({
    where: { id },
    include: {
      numerata: true,
      laboratorio: true,
      reparto: true,
      linea: true,
      user: true,
    },
  });
  if (!rip) {
    throw new Error(`Riparazione ${id} non trovata`);
  }

  // Fetch cartellino data from core_dati for COMMESSA, ARTICOLO, URGENZA
  let commessa = '-';
  let articolo = '-';
  let urgenza = 'NORMALE';

  if (rip.cartellino) {
    const cartelNum = parseInt(rip.cartellino);
    if (!isNaN(cartelNum)) {
      const coreData = await prisma.coreData.findFirst({
        where: { cartel: cartelNum },
      });
      if (coreData) {
        commessa = coreData.commessaCli || '-';
        articolo = coreData.descrizioneArticolo || '-';
        // Default urgenza (can be enhanced with additional fields if available)
        urgenza = 'NORMALE';
      }
    }
  }

  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, '');
  const fileName = `CEDOLA_${rip.idRiparazione}_${dateStr}_${timeStr}.pdf`;
  const { fullPath } = await ensureOutputPath(userId, jobId, fileName);

  // TCPDF margins: 7mm = ~20pt (1mm = 2.83465pt)
  const doc = new PDFDocument({
    size: 'A4',
    margin: 20,
    bufferPages: true
  });

  // Colors
  const headerFill = '#d6dce5';  // RGB(214, 220, 229)
  const black = '#000000';
  const white = '#ffffff';
  const grayText = '#737373';    // RGB(115, 115, 115)
  const lightGray = '#f0f0f0';   // RGB(240, 240, 240)
  const urgentGray = '#b4b4b4';  // RGB(180, 180, 180)

  // Measurements (converting mm to pt)
  const mm = 2.83465;
  const pageWidth = 210 * mm; // A4 width
  const margin = 7 * mm;
  const contentWidth = 196 * mm;

  let y = margin;

  // ==================== HEADER ====================
  // Main header box (196mm x 25mm) with light blue fill
  doc.rect(margin, y, contentWidth, 25 * mm)
    .fillAndStroke(headerFill, black);

  // Left box for barcode (46mm x 25mm)
  doc.rect(margin, y, 46 * mm, 25 * mm)
    .stroke();

  // Barcode simulation (C39 style) - centered in left box
  const barcodeX = margin + 3 * mm;
  const barcodeY = y + 3 * mm;
  const barcodeWidth = 40 * mm;
  const barcodeHeight = 15 * mm;

  // Draw barcode bars (simplified)
  doc.fillColor(black);
  for (let i = 0; i < 25; i++) {
    const x = barcodeX + (i * barcodeWidth / 25);
    const w = (i % 3 === 0) ? 2.5 : 1.2;
    if (i % 2 === 0) {
      doc.rect(x, barcodeY, w, barcodeHeight).fill();
    }
  }

  // Barcode text
  doc.fillColor(black)
    .font('Helvetica', 10)
    .text(rip.idRiparazione, margin, barcodeY + barcodeHeight + 2, {
      width: 46 * mm,
      align: 'center'
    });

  // Title text "CEDOLA DI RIPARAZIONE"
  doc.fillColor(black)
    .font('Helvetica-Bold', 30)
    .text('CEDOLA DI RIPARAZIONE', margin + 50 * mm, y + 8 * mm, {
      width: 140 * mm,
      align: 'left'
    });

  y += 27 * mm;

  // ==================== COMPANY BANNER ====================
  doc.rect(margin, y, contentWidth, 3 * mm)
    .fillAndStroke(white, black);

  doc.fillColor(black)
    .font('Helvetica-Bold', 10)
    .text('CALZATURIFICIO EMMEGIEMME SHOES S.R.L', margin, y + 0.5 * mm, {
      width: contentWidth,
      align: 'center'
    });

  y += 4 * mm;

  // ==================== INFO BOX ====================
  const infoBoxY = y;
  doc.rect(margin, infoBoxY, contentWidth, 60 * mm)
    .stroke();

  y += 2 * mm;
  const leftCol = margin + 2 * mm;
  const rightCol = margin + 110 * mm;

  // LABORATORIO and REPARTO labels
  doc.fillColor(black)
    .font('Helvetica', 12)
    .text('LABORATORIO:', leftCol, y)
    .text('REPARTO:', rightCol, y);

  y += 5 * mm;

  // LABORATORIO and REPARTO values (bold, large)
  doc.font('Helvetica-Bold', 25)
    .text((rip.laboratorio?.nome || '').toUpperCase(), leftCol, y, {
      width: 100 * mm
    });

  doc.font('Helvetica-Bold', 16)
    .text((rip.reparto?.nome || '-').toUpperCase(), rightCol, y);

  y += 12 * mm;

  // CARTELLINO, COMMESSA, QTA, LINEA labels
  doc.font('Helvetica', 12)
    .text('CARTELLINO:', leftCol, y)
    .text('COMMESSA:', leftCol + 50 * mm, y)
    .text('QTA:', leftCol + 120 * mm, y)
    .text('LINEA:', leftCol + 155 * mm, y);

  y += 5 * mm;

  // Values
  doc.font('Helvetica-Bold', 16)
    .text(String(rip.cartellino || '-'), leftCol, y)
    .text(commessa, leftCol + 50 * mm, y)
    .text(String(rip.qtaTotale || 0), leftCol + 120 * mm, y)
    .text(rip.linea?.nome || '-', leftCol + 155 * mm, y);

  y += 10 * mm;

  // ARTICOLO and URGENZA
  doc.font('Helvetica', 12)
    .text('ARTICOLO:', leftCol, y)
    .text('URGENZA:', leftCol + 120 * mm, y);

  y += 5 * mm;

  doc.font('Helvetica-Bold', 16)
    .text(urgenza, leftCol + 120 * mm, y);

  y += 6 * mm;

  // Black ARTICOLO banner
  doc.rect(margin, y, contentWidth, 10 * mm)
    .fillAndStroke(black, black);

  doc.fillColor(white)
    .font('Helvetica-Bold', 20)
    .text(articolo.toUpperCase(), margin, y + 2 * mm, {
      width: contentWidth,
      align: 'center'
    });

  y += 13 * mm;

  // ==================== NUMERATA TABLE ====================
  const numerataBoxY = y;
  doc.rect(margin, numerataBoxY, contentWidth, 35 * mm)
    .stroke();

  y += 5 * mm;

  doc.fillColor(black)
    .font('Helvetica-Bold', 15)
    .text('NUMERATA DA RIPARARE:', leftCol, y);

  y += 8 * mm;

  // Build arrays for numerata names and quantities
  const names: string[] = [];
  const quantities: number[] = [];

  for (let i = 1; i <= 20; i++) {
    const nField = `n${String(i).padStart(2, '0')}` as keyof typeof rip.numerata;
    const pField = `p${String(i).padStart(2, '0')}` as keyof typeof rip;
    names.push(String(rip.numerata?.[nField] || ''));
    quantities.push((rip[pField] as number) || 0);
  }

  // Draw 20-column table with HTML-like rendering
  const colWidth = (contentWidth - 10 * mm) / 20;
  const tableX = leftCol;

  // Row 1: Size names (gray background)
  doc.fillColor(lightGray);
  for (let i = 0; i < 20; i++) {
    doc.rect(tableX + (i * colWidth), y, colWidth, 7 * mm)
      .fillAndStroke(lightGray, black);
  }

  doc.fillColor(black).font('Helvetica-Bold', 10);
  for (let i = 0; i < 20; i++) {
    if (names[i]) {
      doc.text(names[i], tableX + (i * colWidth), y + 1.5 * mm, {
        width: colWidth,
        align: 'center'
      });
    }
  }

  y += 7 * mm;

  // Row 2: Quantities
  for (let i = 0; i < 20; i++) {
    doc.rect(tableX + (i * colWidth), y, colWidth, 7 * mm)
      .stroke();
  }

  doc.fillColor(black).font('Helvetica-Bold', 10);
  for (let i = 0; i < 20; i++) {
    if (quantities[i] > 0) {
      doc.text(String(quantities[i]), tableX + (i * colWidth), y + 1.5 * mm, {
        width: colWidth,
        align: 'center'
      });
    }
  }

  y += 12 * mm;

  // ==================== MOTIVO RIPARAZIONE ====================
  const motivoBoxY = y;
  doc.rect(margin, motivoBoxY, contentWidth, 77 * mm)
    .stroke();

  y += 5 * mm;

  doc.fillColor(black)
    .font('Helvetica-Bold', 15)
    .text('MOTIVO RIPARAZIONE', leftCol, y);

  y += 8 * mm;

  // Show URGENTE watermark if urgency is ALTA
  if (urgenza === 'ALTA') {
    doc.fillColor(urgentGray)
      .font('Helvetica-Bold', 30)
      .text('URGENTE', leftCol, motivoBoxY + 65 * mm);
  }

  // Causale text
  doc.fillColor(black)
    .font('Helvetica', 13)
    .text(rip.causale || '-', leftCol, y, {
      width: 150 * mm,
      height: 60 * mm
    });

  y = motivoBoxY + 82 * mm;

  // ==================== CENTRAL CODE BAR ====================
  doc.rect(margin, y, contentWidth, 10 * mm)
    .fillAndStroke(black, black);

  // Display idRiparazione centered with underscores
  const codePadded = rip.idRiparazione.padEnd(12, '_');
  doc.fillColor(white)
    .font('Helvetica-Bold', 20)
    .text(codePadded, margin, y + 2 * mm, {
      width: contentWidth,
      align: 'center'
    });

  y += 15 * mm;

  // ==================== FOOTER ====================
  doc.fillColor(grayText)
    .font('Helvetica-Bold', 16)
    .text('RIPARAZIONE N°:', leftCol, y);

  // Box for ID
  const idBoxX = leftCol + 60 * mm;
  doc.rect(idBoxX, y - 2 * mm, 30 * mm, 10 * mm)
    .stroke();

  doc.fillColor(black)
    .font('Helvetica', 25)
    .text(rip.idRiparazione, idBoxX, y, {
      width: 30 * mm,
      align: 'center'
    });

  // Box for REPARTO
  const repartoBoxX = idBoxX + 40 * mm;
  doc.rect(repartoBoxX, y - 2 * mm, 60 * mm, 10 * mm)
    .fillAndStroke('#dedede', black);

  doc.fillColor(black)
    .font('Helvetica-Bold', 16)
    .text((rip.reparto?.nome || '-').toUpperCase(), repartoBoxX, y + 1 * mm, {
      width: 60 * mm,
      align: 'center'
    });

  y += 15 * mm;

  // Date and operator
  const footerRightX = margin + 100 * mm;

  doc.fillColor(black)
    .font('Helvetica', 12)
    .text('CEDOLA CREATA IL:', footerRightX, y, {
      align: 'right',
      width: 50 * mm
    })
    .text(date.toISOString().slice(0, 10), footerRightX + 50 * mm, y, {
      align: 'right',
      width: 40 * mm
    });

  // Horizontal line
  doc.moveTo(margin + 3 * mm, y + 8 * mm)
    .lineTo(margin + contentWidth - 3 * mm, y + 8 * mm)
    .stroke();

  y += 10 * mm;

  // Operator name
  const operatorName = rip.user?.userName || rip.user?.nome || '-';
  doc.fillColor(black)
    .font('Helvetica-Bold', 12)
    .text(operatorName, footerRightX + 50 * mm, y, {
      align: 'right',
      width: 40 * mm
    });

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
