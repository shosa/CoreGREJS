import PDFDocument = require('pdfkit');
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { JobHandler } from '../types';
import * as bwipjs from 'bwip-js';
import { getCompanyInfo } from './company-info.helper';

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
      user: true,
    },
  });
  if (!rip) {
    throw new Error(`Riparazione ${id} non trovata`);
  }

  // Fetch cartellino data from core_dati for COMMESSA, ARTICOLO, URGENZA
  let commessa = '-';
  let articolo = '-';
  let descrizioneArticolo = '-';
  let urgenza = 'NORMALE';

  if (rip.cartellino) {
    const cartelNum = parseInt(rip.cartellino);
    if (!isNaN(cartelNum)) {
      const coreData = await prisma.coreData.findFirst({
        where: { cartel: cartelNum },
      });
      if (coreData) {
        commessa = coreData.commessaCli || '-';
        articolo = coreData.articolo || '-';
        descrizioneArticolo = coreData.descrizioneArticolo || '-';
        // Default urgenza (can be enhanced with additional fields if available)
        urgenza = 'NORMALE';
      }
    }
  }

  // Leggi dati aziendali dalle impostazioni
  const company = await getCompanyInfo(prisma);

  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, '');
  const fileName = `CEDOLA RIP ${rip.idRiparazione}_${dateStr}_${timeStr}.pdf`;
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

  // Generate real CODE39 barcode
  const barcodeX = margin + 3 * mm;
  const barcodeY = y + 2 * mm;
  const barcodeWidth = 40 * mm;
  const barcodeHeight = 18 * mm;

  try {
    // Generate barcode as PNG buffer
    const barcodeBuffer = await bwipjs.toBuffer({
      bcid: 'code39',           // Barcode type
      text: rip.idRiparazione,  // Text to encode
      scale: 3,                  // 3x scaling factor
      height: 15,                // Bar height in millimeters
      includetext: true,         // Include human-readable text
      textxalign: 'center',      // Center text
      textsize: 10,              // Font size for text
    });

    // Insert barcode image into PDF
    doc.image(barcodeBuffer, barcodeX, barcodeY, {
      width: barcodeWidth,
      height: barcodeHeight,
      align: 'center'
    });
  } catch (err) {
    // Fallback: just display text if barcode generation fails
    console.error('Barcode generation failed:', err);
    doc.fillColor(black)
      .font('Helvetica-Bold', 12)
      .text(rip.idRiparazione, barcodeX, barcodeY + 8 * mm, {
        width: barcodeWidth,
        align: 'center'
      });
  }

  // Title text "CEDOLA DI RIPARAZIONE"
  doc.fillColor(black)
    .font('Helvetica-Bold', 30)
    .text('CEDOLA DI RIPARAZIONE', margin + 50 * mm, y + 8 * mm, {
      width: 140 * mm,
      align: 'left'
    });

  y += 27 * mm;

  // ==================== COMPANY BANNER ====================
  // Calcola altezza banner in base alle righe da mostrare
  const bannerLines = [
    company.nomeAzienda || 'AZIENDA',
    [company.indirizzo, [company.cap, company.citta, company.provincia].filter(Boolean).join(' ')].filter(Boolean).join(' - '),
    [company.partitaIva ? `P.IVA: ${company.partitaIva}` : '', company.telefono ? `Tel: ${company.telefono}` : '', company.email].filter(Boolean).join('  |  '),
  ].filter(Boolean);

  const bannerHeight = (bannerLines.length * 4.5 + 2) * mm;
  doc.rect(margin, y, contentWidth, bannerHeight)
    .fillAndStroke(white, black);

  let bannerY = y + 1.5 * mm;
  doc.fillColor(black).font('Helvetica-Bold', 11)
    .text(bannerLines[0], margin, bannerY, { width: contentWidth, align: 'center' });
  if (bannerLines[1]) {
    bannerY += 4.5 * mm;
    doc.font('Helvetica', 8).text(bannerLines[1], margin, bannerY, { width: contentWidth, align: 'center' });
  }
  if (bannerLines[2]) {
    bannerY += 4 * mm;
    doc.font('Helvetica', 7).fillColor('#444444').text(bannerLines[2], margin, bannerY, { width: contentWidth, align: 'center' });
  }

  y += bannerHeight + 1 * mm;

  // ==================== INFO BOX ====================
  const infoBoxY = y;
  doc.rect(margin, infoBoxY, contentWidth, 62 * mm)
    .fillAndStroke('#f9fafb', black);

  y += 3 * mm;
  const leftCol = margin + 4 * mm;
  const rightCol = margin + 108 * mm;

  // LABORATORIO and REPARTO labels
  doc.fillColor('#4b5563')
    .font('Helvetica-Bold', 11)
    .text('LABORATORIO:', leftCol, y)
    .text('REPARTO:', rightCol, y);

  y += 6 * mm;

  // LABORATORIO and REPARTO values (bold, large)
  doc.fillColor(black)
    .font('Helvetica-Bold', 26)
    .text((rip.laboratorio?.nome || '').toUpperCase(), leftCol, y, {
      width: 100 * mm
    });

  doc.font('Helvetica-Bold', 18)
    .text((rip.reparto?.nome || '-').toUpperCase(), rightCol, y);

  y += 13 * mm;

  // CARTELLINO, COMMESSA, QTA labels
  doc.fillColor('#4b5563')
    .font('Helvetica-Bold', 10)
    .text('CARTELLINO:', leftCol, y)
    .text('COMMESSA:', leftCol + 48 * mm, y)
    .text('QTA:', leftCol + 116 * mm, y);

  y += 5 * mm;

  // Values
  doc.fillColor(black)
    .font('Helvetica-Bold', 15)
    .text(String(rip.cartellino || '-'), leftCol, y)
    .text(commessa, leftCol + 48 * mm, y)
    .text(String(rip.qtaTotale || 0), leftCol + 116 * mm, y);

  y += 10 * mm;

  // ARTICOLO and URGENZA labels
  doc.fillColor('#4b5563')
    .font('Helvetica-Bold', 10)
    .text('ARTICOLO:', leftCol, y)
    .text('URGENZA:', leftCol + 116 * mm, y);

  y += 5 * mm;

  // URGENZA value with colored badge
  const urgenzaX = leftCol + 116 * mm;
  const urgenzaColor = urgenza === 'ALTA' ? '#dc2626' : '#16a34a';
  const urgenzaBg = urgenza === 'ALTA' ? '#fee2e2' : '#dcfce7';

  doc.rect(urgenzaX, y - 1 * mm, 35 * mm, 8 * mm)
    .fillAndStroke(urgenzaBg, urgenzaColor);

  doc.fillColor(urgenzaColor)
    .font('Helvetica-Bold', 14)
    .text(urgenza, urgenzaX, y + 1 * mm, {
      width: 35 * mm,
      align: 'center'
    });

  y += 9 * mm;

  // Black ARTICOLO banner with shadow effect
  doc.rect(margin, y, contentWidth, 12 * mm)
    .fillAndStroke('#1f2937', black);

  // Auto-scale font size to fit description
  const maxDescLength = descrizioneArticolo.length;
  let descFontSize = 22;
  if (maxDescLength > 60) {
    descFontSize = 14;
  } else if (maxDescLength > 45) {
    descFontSize = 16;
  } else if (maxDescLength > 30) {
    descFontSize = 18;
  }

  doc.fillColor(white)
    .font('Helvetica-Bold', descFontSize)
    .text(descrizioneArticolo.toUpperCase(), margin, y + 3 * mm, {
      width: contentWidth,
      align: 'center'
    });

  y += 14 * mm;

  // ==================== NUMERATA TABLE ====================
  const numerataBoxY = y;
  doc.rect(margin, numerataBoxY, contentWidth, 38 * mm)
    .fillAndStroke('#fefefe', black);

  y += 4 * mm;

  doc.fillColor('#1f2937')
    .font('Helvetica-Bold', 14)
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

  // Draw 20-column table with enhanced styling
  const colWidth = (contentWidth - 8 * mm) / 20;
  const tableX = leftCol;

  // Row 1: Size names (gradient header)
  for (let i = 0; i < 20; i++) {
    doc.rect(tableX + (i * colWidth), y, colWidth, 8 * mm)
      .fillAndStroke('#e5e7eb', '#6b7280');
  }

  doc.fillColor('#1f2937').font('Helvetica-Bold', 9);
  for (let i = 0; i < 20; i++) {
    if (names[i]) {
      doc.text(names[i], tableX + (i * colWidth), y + 2 * mm, {
        width: colWidth,
        align: 'center'
      });
    }
  }

  y += 8 * mm;

  // Row 2: Quantities with alternating colors
  for (let i = 0; i < 20; i++) {
    const cellBg = quantities[i] > 0 ? '#dbeafe' : white;
    doc.rect(tableX + (i * colWidth), y, colWidth, 8 * mm)
      .fillAndStroke(cellBg, '#6b7280');
  }

  doc.fillColor(black).font('Helvetica-Bold', 11);
  for (let i = 0; i < 20; i++) {
    if (quantities[i] > 0) {
      doc.text(String(quantities[i]), tableX + (i * colWidth), y + 2 * mm, {
        width: colWidth,
        align: 'center'
      });
    }
  }

  y += 13 * mm;

  // ==================== MOTIVO RIPARAZIONE ====================
  const motivoBoxY = y;
  doc.rect(margin, motivoBoxY, contentWidth, 80 * mm)
    .fillAndStroke('#fefefe', black);

  y += 4 * mm;

  doc.fillColor('#1f2937')
    .font('Helvetica-Bold', 14)
    .text('MOTIVO RIPARAZIONE', leftCol, y);

  y += 9 * mm;

  // Draw inner text box with border
  const textBoxX = leftCol;
  const textBoxY = y;
  const textBoxWidth = contentWidth - 8 * mm;
  const textBoxHeight = 62 * mm;

  doc.rect(textBoxX, textBoxY, textBoxWidth, textBoxHeight)
    .stroke('#d1d5db');

  // Show URGENTE watermark if urgency is ALTA
  if (urgenza === 'ALTA') {
    doc.save();
    doc.opacity(0.15)
      .fillColor('#dc2626')
      .font('Helvetica-Bold', 45)
      .text('URGENTE', textBoxX, textBoxY + 20 * mm, {
        width: textBoxWidth,
        align: 'center'
      });
    doc.restore();
  }

  // Causale text
  doc.fillColor(black)
    .font('Helvetica', 12)
    .text(rip.causale || '-', textBoxX + 3 * mm, textBoxY + 3 * mm, {
      width: textBoxWidth - 6 * mm,
      height: textBoxHeight - 6 * mm,
      lineGap: 2
    });

  y = motivoBoxY + 85 * mm;

  // ==================== CENTRAL CODE BAR ====================
  doc.rect(margin, y, contentWidth, 12 * mm)
    .fillAndStroke('#1f2937', black);

  // Display articolo code centered (fixed font size)
  doc.fillColor(white)
    .font('Courier-Bold', 18)
    .text(articolo.toUpperCase(), margin, y + 3 * mm, {
      width: contentWidth,
      align: 'center'
    });

  y += 16 * mm;

  // ==================== FOOTER ====================
  // Decorative line
  doc.moveTo(margin, y)
    .lineTo(margin + contentWidth, y)
    .lineWidth(0.5)
    .stroke('#d1d5db');

  y += 4 * mm;

  doc.fillColor('#6b7280')
    .font('Helvetica-Bold', 14)
    .text('RIPARAZIONE N°:', leftCol, y);

  // Box for ID with gradient
  const idBoxX = leftCol + 58 * mm;
  doc.rect(idBoxX, y - 2 * mm, 32 * mm, 12 * mm)
    .fillAndStroke('#f3f4f6', '#6b7280');

  doc.fillColor(black)
    .font('Helvetica-Bold', 24)
    .text(rip.idRiparazione, idBoxX, y + 1 * mm, {
      width: 32 * mm,
      align: 'center'
    });

  // Box for REPARTO with colored background
  const repartoBoxX = idBoxX + 38 * mm;
  doc.rect(repartoBoxX, y - 2 * mm, 62 * mm, 12 * mm)
    .fillAndStroke('#e0e7ff', '#6366f1');

  doc.fillColor('#4338ca')
    .font('Helvetica-Bold', 15)
    .text((rip.reparto?.nome || '-').toUpperCase(), repartoBoxX, y + 2 * mm, {
      width: 62 * mm,
      align: 'center'
    });

  y += 18 * mm;

  // Footer with date on left and operator on right
  // Get operator name - try userName first, then nome, then mail, then userId
  let operatorName = '-';
  if (rip.user) {
    operatorName = rip.user.userName || rip.user.nome || rip.user.mail || `User#${rip.userId}`;
  }

  // Left: Creation date
  doc.fillColor('#6b7280')
    .font('Helvetica-Bold', 11)
    .text(date.toISOString().slice(0, 10), leftCol, y);

  // Right: Operator name
  doc.fillColor('#6b7280')
    .font('Helvetica-Bold', 11)
    .text(operatorName.toUpperCase(), margin + contentWidth - 50 * mm, y, {
      align: 'right',
      width: 46 * mm
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
