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

  let commessa = '-';
  let articolo = '-';
  let descrizioneArticolo = '-';
  let linea = '';

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
        linea = coreData.ln || '';
      }
    }
  }

  const company = await getCompanyInfo(prisma);

  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, '');
  const fileName = `CEDOLA RIP ${rip.idRiparazione}_${dateStr}_${timeStr}.pdf`;
  const { fullPath } = await ensureOutputPath(userId, jobId, fileName);

  // A4 landscape: larghezza 297mm × altezza 210mm
  const mm = 2.83465;
  const doc = new PDFDocument({
    size: [297 * mm, 210 * mm],
    margin: 12,
    bufferPages: true,
  });

  // ── Palette colori tecnica ──
  const headerBg    = '#2d3748';
  const headerText  = '#ffffff';
  const sectionBg   = '#f7f8fa';
  const borderColor = '#cbd5e0';
  const labelColor  = '#4a5568';
  const valueColor  = '#1a202c';
  const white       = '#ffffff';
  const separatorColor = '#718096';

  const margin      = 12;
  const pageW       = 297 * mm;
  const pageH       = 210 * mm;
  const contentW    = pageW - margin * 2;

  let y = margin;

  // ══════════════════════════════════════════════════════════
  // HEADER — barcode box separato + striscia nera affiancati
  // ══════════════════════════════════════════════════════════
  const headerH   = 20 * mm;
  const barcodeBoxW = 58 * mm;   // larghezza box barcode (include padding)
  const gap         = 2 * mm;    // spazio tra i due blocchi
  const headerX     = margin + barcodeBoxW + gap;
  const headerW     = contentW - barcodeBoxW - gap;

  // Box barcode: sfondo bianco, bordo nero
  doc.rect(margin, y, barcodeBoxW, headerH)
    .fillAndStroke(white, valueColor);

  // Barcode CODE39 centrato nel box
  const barcodeW = barcodeBoxW - 4 * mm;
  const barcodeH = headerH - 4 * mm;
  try {
    const barcodeBuffer = await bwipjs.toBuffer({
      bcid: 'code39',
      text: rip.idRiparazione,
      scale: 3,
      height: 14,
      includetext: true,
      textxalign: 'center',
      textsize: 8,
      backgroundcolor: 'ffffff',
      barcolor: '1a202c',
      textcolor: '1a202c',
    });
    doc.image(barcodeBuffer, margin + 2 * mm, y + 2 * mm, {
      width: barcodeW,
      height: barcodeH,
    });
  } catch {
    doc.fillColor(valueColor)
      .font('Courier-Bold', 11)
      .text(rip.idRiparazione, margin + 2 * mm, y + 7 * mm, {
        width: barcodeBoxW - 4 * mm,
        align: 'center',
      });
  }

  // Striscia header nera
  doc.rect(headerX, y, headerW, headerH)
    .fillAndStroke(headerBg, headerBg);

  // Titolo allineato a sinistra nella striscia
  const titleW = headerW - 65 * mm;
  doc.fillColor(headerText)
    .font('Helvetica-Bold', 26)
    .text('CEDOLA DI RIPARAZIONE', headerX + 5 * mm, y + 5 * mm, {
      width: titleW,
      align: 'left',
    });

  // Blocco N° + Data a destra nella striscia
  const infoRightX = headerX + headerW - 60 * mm;
  doc.fillColor(headerText)
    .font('Helvetica-Bold', 13)
    .text(`N°  ${rip.idRiparazione}`, infoRightX, y + 3 * mm, {
      width: 57 * mm,
      align: 'right',
    });
  doc.fillColor('#a0aec0')
    .font('Helvetica', 9)
    .text(
      date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      infoRightX, y + 11 * mm,
      { width: 57 * mm, align: 'right' }
    );

  y += headerH + 1;

  // ══════════════════════════════════════════════════════════
  // COMPANY BAR (9mm) — bianco, linea sotto
  // ══════════════════════════════════════════════════════════
  const companyH = 9 * mm;
  doc.rect(margin, y, contentW, companyH)
    .fill(white);

  doc.fillColor(valueColor)
    .font('Helvetica-Bold', 9)
    .text((company.nomeAzienda || '').toUpperCase(), margin, y + 2.5 * mm, {
      width: contentW,
      align: 'center',
    });

  // Linea sotto
  doc.moveTo(margin, y + companyH)
    .lineTo(margin + contentW, y + companyH)
    .lineWidth(0.5)
    .strokeColor(borderColor)
    .stroke();

  y += companyH + 1;

  // ══════════════════════════════════════════════════════════
  // INFO SECTION (26mm) — due colonne con separatore verticale
  // ══════════════════════════════════════════════════════════
  const infoH = 26 * mm;
  doc.rect(margin, y, contentW, infoH)
    .fill(sectionBg);
  doc.rect(margin, y, contentW, infoH)
    .lineWidth(0.5)
    .strokeColor(borderColor)
    .stroke();

  const colDivX = margin + 82 * mm;

  // Separatore verticale
  doc.moveTo(colDivX, y)
    .lineTo(colDivX, y + infoH)
    .lineWidth(0.5)
    .strokeColor(borderColor)
    .stroke();

  // ── Colonna sinistra: LABORATORIO + REPARTO ──
  const leftPad = margin + 4 * mm;
  doc.fillColor(labelColor)
    .font('Helvetica', 7.5)
    .text('LABORATORIO', leftPad, y + 3 * mm);

  doc.fillColor(valueColor)
    .font('Helvetica-Bold', 16)
    .text((rip.laboratorio?.nome || '-').toUpperCase(), leftPad, y + 7 * mm, {
      width: 76 * mm,
    });

  doc.fillColor(labelColor)
    .font('Helvetica', 7.5)
    .text('REPARTO', leftPad, y + 17 * mm);

  doc.fillColor(valueColor)
    .font('Helvetica-Bold', 10)
    .text((rip.reparto?.nome || '-').toUpperCase(), leftPad, y + 21 * mm, {
      width: 76 * mm,
    });

  // ── Colonna destra: griglia dati ──
  const rightPad = colDivX + 4 * mm;
  const rightW   = contentW - 82 * mm - 4 * mm;

  // Riga 1: ARTICOLO | DESCRIZIONE
  doc.fillColor(labelColor)
    .font('Helvetica', 7.5)
    .text('ARTICOLO', rightPad, y + 3 * mm)
    .text('DESCRIZIONE', rightPad + 38 * mm, y + 3 * mm);

  doc.fillColor(valueColor)
    .font('Courier-Bold', 10)
    .text(articolo.toUpperCase(), rightPad, y + 7 * mm, { width: 35 * mm });

  doc.fillColor(valueColor)
    .font('Helvetica-Bold', 10)
    .text(descrizioneArticolo, rightPad + 38 * mm, y + 7 * mm, {
      width: rightW - 38 * mm,
      lineBreak: false,
      ellipsis: true,
    });

  // Linea separatrice interna
  doc.moveTo(rightPad, y + 15 * mm)
    .lineTo(margin + contentW - 4 * mm, y + 15 * mm)
    .lineWidth(0.3)
    .strokeColor(borderColor)
    .stroke();

  // Riga 2: CARTELLINO | COMMESSA | QTÀ
  doc.fillColor(labelColor)
    .font('Helvetica', 7.5)
    .text('CARTELLINO', rightPad, y + 17 * mm)
    .text('COMMESSA', rightPad + 38 * mm, y + 17 * mm)
    .text('QTÀ TOTALE', rightPad + 90 * mm, y + 17 * mm);

  doc.fillColor(valueColor)
    .font('Helvetica-Bold', 11)
    .text(String(rip.cartellino || '-'), rightPad, y + 21 * mm)
    .text(commessa, rightPad + 38 * mm, y + 21 * mm)
    .text(String(rip.qtaTotale || 0), rightPad + 90 * mm, y + 21 * mm);

  y += infoH + 1;

  // ══════════════════════════════════════════════════════════
  // NUMERATA (30mm)
  // ══════════════════════════════════════════════════════════
  const numerataH = 30 * mm;
  doc.rect(margin, y, contentW, numerataH)
    .fill(white);
  doc.rect(margin, y, contentW, numerataH)
    .lineWidth(0.5)
    .strokeColor(borderColor)
    .stroke();

  // Titolo sezione con linea decorativa
  doc.moveTo(margin + 4 * mm, y + 4 * mm)
    .lineTo(margin + 32 * mm, y + 4 * mm)
    .lineWidth(0.8)
    .strokeColor(separatorColor)
    .stroke();

  doc.fillColor(labelColor)
    .font('Helvetica-Bold', 7.5)
    .text('NUMERATA DA RIPARARE', margin + 34 * mm, y + 1.5 * mm, {
      width: contentW - 70 * mm,
      align: 'left',
    });

  doc.moveTo(margin + 34 * mm + 56 * mm, y + 4 * mm)
    .lineTo(margin + contentW - 4 * mm, y + 4 * mm)
    .lineWidth(0.8)
    .strokeColor(separatorColor)
    .stroke();

  // Costruisci arrays filtrando le taglie vuote
  const names: string[] = [];
  const quantities: number[] = [];

  for (let i = 1; i <= 20; i++) {
    const nField = `n${String(i).padStart(2, '0')}` as keyof typeof rip.numerata;
    const pField = `p${String(i).padStart(2, '0')}` as keyof typeof rip;
    const name = String(rip.numerata?.[nField] || '');
    const qty  = (rip[pField] as number) || 0;
    if (name.trim()) {
      names.push(name);
      quantities.push(qty);
    }
  }

  if (names.length > 0) {
    const tableY    = y + 8 * mm;
    const rowH      = 9 * mm;
    const tableX    = margin + 4 * mm;
    const tableW    = contentW - 8 * mm;
    const colW      = tableW / names.length;

    // Riga header taglie
    for (let i = 0; i < names.length; i++) {
      doc.rect(tableX + i * colW, tableY, colW, rowH)
        .fillAndStroke('#e2e8f0', borderColor);
    }
    doc.fillColor(valueColor).font('Helvetica-Bold', 10);
    for (let i = 0; i < names.length; i++) {
      doc.text(names[i], tableX + i * colW, tableY + 2.5 * mm, {
        width: colW,
        align: 'center',
      });
    }

    // Riga quantità
    for (let i = 0; i < names.length; i++) {
      const hasQty = quantities[i] > 0;
      doc.rect(tableX + i * colW, tableY + rowH, colW, rowH)
        .fillAndStroke(white, borderColor);
      if (hasQty) {
        // bordo più spesso per celle con quantità
        doc.rect(tableX + i * colW + 0.5, tableY + rowH + 0.5, colW - 1, rowH - 1)
          .lineWidth(1.2)
          .strokeColor('#4a5568')
          .stroke();
      }
    }
    doc.fillColor(valueColor).font('Helvetica-Bold', 12).lineWidth(0.5);
    for (let i = 0; i < names.length; i++) {
      if (quantities[i] > 0) {
        doc.text(String(quantities[i]), tableX + i * colW, tableY + rowH + 2 * mm, {
          width: colW,
          align: 'center',
        });
      }
    }
  }

  y += numerataH + 1;

  // ══════════════════════════════════════════════════════════
  // CAUSALE (spazio ridotto — sotto ci sono footer + strip barcode)
  // ══════════════════════════════════════════════════════════
  const footerH  = 10 * mm;
  const stripH   = 14 * mm;  // altezza striscia 4 barcode in fondo
  const stripGap =  2 * mm;  // margine sopra la striscia
  const causaleH = pageH - y - footerH - stripH - stripGap - margin - 3;

  doc.rect(margin, y, contentW, causaleH)
    .fill(sectionBg);
  doc.rect(margin, y, contentW, causaleH)
    .lineWidth(0.5)
    .strokeColor(borderColor)
    .stroke();

  // Titolo sezione
  doc.moveTo(margin + 4 * mm, y + 4 * mm)
    .lineTo(margin + 28 * mm, y + 4 * mm)
    .lineWidth(0.8)
    .strokeColor(separatorColor)
    .stroke();

  doc.fillColor(labelColor)
    .font('Helvetica-Bold', 7.5)
    .text('MOTIVO RIPARAZIONE', margin + 30 * mm, y + 1.5 * mm, {
      width: 60 * mm,
    });

  doc.moveTo(margin + 30 * mm + 48 * mm, y + 4 * mm)
    .lineTo(margin + contentW - 4 * mm, y + 4 * mm)
    .lineWidth(0.8)
    .strokeColor(separatorColor)
    .stroke();

  // Filigrana LINEA — basso destra del riquadro causale
  if (linea.trim()) {
    doc.save();
    doc.opacity(0.08)
      .fillColor(valueColor)
      .font('Helvetica-Bold', 80)
      .text(linea.toUpperCase(), margin, y + causaleH - 32 * mm, {
        width: contentW,
        align: 'right',
      });
    doc.restore();
  }

  // Testo causale — due colonne affiancate per evitare sforamento verticale
  const causaleTextY  = y + 8 * mm;
  const causaleTextH  = causaleH - 12 * mm;
  const colGap        = 4 * mm;
  const colW_causale  = (contentW - 8 * mm - colGap) / 2;
  const colLeft       = margin + 4 * mm;

  // Separatore verticale tra le due colonne
  const sepX = colLeft + colW_causale + colGap / 2;  // centro del gap
  doc.moveTo(sepX, causaleTextY)
    .lineTo(sepX, causaleTextY + causaleTextH)
    .lineWidth(0.3)
    .strokeColor(borderColor)
    .stroke();

  // Colonna sinistra — con columns PDFKit: se il testo non entra continua a destra
  doc.fillColor(valueColor)
    .font('Helvetica', 11)
    .text(rip.causale || '-', colLeft, causaleTextY, {
      width:    colW_causale,
      height:   causaleTextH,
      lineGap:  2,
      columns:  2,
      columnGap: colGap,
    });

  y += causaleH + 1;

  // ══════════════════════════════════════════════════════════
  // FOOTER (10mm)
  // ══════════════════════════════════════════════════════════
  doc.moveTo(margin, y)
    .lineTo(margin + contentW, y)
    .lineWidth(0.5)
    .strokeColor(borderColor)
    .stroke();

  y += 1;

  let operatorName = '-';
  if (rip.user) {
    operatorName = rip.user.userName || rip.user.nome || rip.user.mail || `User#${rip.userId}`;
  }

  const footerY = y + 2 * mm;

  doc.fillColor(valueColor)
    .font('Helvetica-Bold', 8)
    .text(operatorName.toUpperCase(), margin, footerY);

  const stampaTxt = `${date.toLocaleDateString('it-IT')} ${date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
  doc.fillColor(labelColor)
    .font('Helvetica', 8)
    .text(stampaTxt, margin, footerY, { width: contentW, align: 'center' });

  doc.fillColor(separatorColor)
    .font('Helvetica', 8)
    .text('CoreGRE', margin, footerY, {
      width: contentW,
      align: 'right',
    });

  y += footerH + stripGap;

  // ══════════════════════════════════════════════════════════
  // STRISCIA 4 BARCODE — equidistanti, per tutta la larghezza
  // Ogni box: barcode a sinistra (senza testo), cartellino e
  // commessa a destra su due righe, bordo nero, sfondo bianco
  // ══════════════════════════════════════════════════════════
  const numBoxes  = 4;
  const boxW      = 55 * mm;                                      // larghezza fissa box
  const boxGap    = (contentW - boxW * numBoxes) / (numBoxes - 1); // gap uniforme calcolato
  const boxH      = stripH;
  const innerBarW = boxW * 0.40;   // barcode occupa ~40% larghezza box
  const innerBarH = boxH - 3 * mm; // aderente all'altezza del box

  // Barcode senza testo sotto (includetext: false)
  let stripBarcodeBuffer: Buffer | null = null;
  try {
    stripBarcodeBuffer = await bwipjs.toBuffer({
      bcid: 'code39',
      text: rip.idRiparazione,
      scale: 3,
      height: 16,
      includetext: false,   // nessun testo sotto le barre
      backgroundcolor: 'ffffff',
      barcolor: '1a202c',
    });
  } catch { /* fallback testo */ }

  for (let i = 0; i < numBoxes; i++) {
    const boxX = margin + i * (boxW + boxGap);

    // Box bordo nero, sfondo bianco
    doc.rect(boxX, y, boxW, boxH)
      .fillAndStroke(white, valueColor);

    // Barcode a sinistra nel box — centrato verticalmente, più piccolo
    const barOffsetY = (boxH - innerBarH) / 2;
    if (stripBarcodeBuffer) {
      doc.image(stripBarcodeBuffer, boxX + 2 * mm, y + barOffsetY, {
        width: innerBarW,
        height: innerBarH,
      });
    } else {
      doc.fillColor(valueColor)
        .font('Courier-Bold', 7)
        .text(rip.idRiparazione, boxX + 1 * mm, y + boxH / 2 - 3, {
          width: innerBarW,
          align: 'center',
        });
    }

    // Solo valori a destra (senza label, font piccolo)
    const txtX = boxX + innerBarW + 2.5 * mm;
    const txtW = boxW - innerBarW - 4 * mm;

    doc.fillColor(valueColor)
      .font('Helvetica', 7.5)
      .text(String(rip.cartellino || '-'), txtX, y + 2 * mm, { width: txtW, lineBreak: false });

    doc.fillColor(valueColor)
      .font('Helvetica', 7)
      .text(commessa, txtX, y + 7 * mm, { width: txtW, lineBreak: false, ellipsis: true });
  }

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
