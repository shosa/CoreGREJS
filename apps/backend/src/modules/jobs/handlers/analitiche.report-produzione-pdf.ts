import PDFDocument = require('pdfkit');
import * as fs from 'fs';
import { JobHandler } from '../types';

interface ProduzioneFilters {
  userId: number;
  jobId: string;
  anno: number;
  mese: number; // 1-12
  tipoDocumento?: string;
  linea?: string;
  includeProduzione?: boolean;
}

const GIORNI_SETTIMANA = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const MESI_NOMI = [
  '', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

function getDaysInMonth(anno: number, mese: number): Date[] {
  const days: Date[] = [];
  const date = new Date(anno, mese - 1, 1);
  while (date.getMonth() === mese - 1) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function getWeekNumber(day: Date, firstDayOfMonth: Date): number {
  const diff = day.getDate() - 1;
  const firstDow = firstDayOfMonth.getDay();
  return Math.floor((diff + firstDow) / 7) + 1;
}

const handler: JobHandler = async (payload, helpers) => {
  const {
    userId,
    jobId,
    anno,
    mese,
    tipoDocumento,
    linea,
    includeProduzione = false,
  } = payload as ProduzioneFilters;

  const { ensureOutputPath } = helpers;
  const prisma = (helpers.trackingService as any).prisma;

  const meseNome = MESI_NOMI[mese] || `Mese ${mese}`;
  const suffix = includeProduzione ? '_COMBINATO' : '';
  const fileName = `PRODUZIONE_MESE_${meseNome.toUpperCase()}_${anno}${suffix}.pdf`;
  const { fullPath } = await ensureOutputPath(userId, jobId, fileName);

  const dateFrom = new Date(anno, mese - 1, 1);
  const dateTo = new Date(anno, mese, 0, 23, 59, 59, 999);

  // --- Fetch dati spedizioni (analitiche) ---
  const whereAna: any = {
    repartoFinaleId: { not: null },
    dataDocumento: { gte: dateFrom, lte: dateTo },
  };
  if (tipoDocumento) whereAna.tipoDocumento = tipoDocumento;
  if (linea) whereAna.linea = linea;

  const recordsAna = await prisma.analiticaRecord.findMany({
    where: whereAna,
    include: { repartoFinale: true },
    orderBy: { dataDocumento: 'asc' },
  });

  const repartiAna = await prisma.analiticaReparto.findMany({
    where: { attivo: true },
    orderBy: [{ ordine: 'asc' }, { nome: 'asc' }],
  });

  // Griglia spedizioni: Map<dayKey, Map<anaRepartoId, qty>>
  const gridAna: Map<string, Map<number, number>> = new Map();
  for (const rec of recordsAna) {
    const dk = rec.dataDocumento ? new Date(rec.dataDocumento).toISOString().split('T')[0] : null;
    if (!dk) continue;
    if (!gridAna.has(dk)) gridAna.set(dk, new Map());
    const m = gridAna.get(dk)!;
    m.set(rec.repartoFinaleId, (m.get(rec.repartoFinaleId) || 0) + Number(rec.quantita || 0));
  }

  // --- Fetch dati produzione (se richiesto) ---
  let repartiProd: any[] = [];
  const gridProd: Map<string, Map<number, number>> = new Map(); // dayKey -> anaRepartoId -> qty (aggregato dai dept mappati)

  if (includeProduzione) {
    // Fetch mappature ana_reparto → prod_departments
    const mappings = await prisma.analiticaRepartoMapping.findMany({
      include: { prodDepartment: true },
    });

    // anaRepartoId → prodDeptId[]
    const anaToProds: Map<number, number[]> = new Map();
    for (const m of mappings) {
      if (!anaToProds.has(m.analiticaRepartoId)) anaToProds.set(m.analiticaRepartoId, []);
      anaToProds.get(m.analiticaRepartoId)!.push(m.prodDepartmentId);
    }

    // Reparti analitiche che hanno almeno una mappatura (in ordine)
    const mappedAnaIds = new Set(mappings.map((m: any) => m.analiticaRepartoId));
    repartiProd = repartiAna.filter((r: any) => mappedAnaIds.has(r.id));

    // Tutti i dept produzione mappati
    const allDeptIds = mappings.map((m: any) => m.prodDepartmentId);

    if (allDeptIds.length > 0) {
      const prodValues = await prisma.productionValue.findMany({
        where: {
          record: { productionDate: { gte: dateFrom, lte: dateTo } },
          departmentId: { in: allDeptIds },
        },
        include: { record: true },
      });

      // deptId → anaRepartoId (reverse map)
      const deptToAna: Map<number, number> = new Map();
      for (const m of mappings) deptToAna.set(m.prodDepartmentId, m.analiticaRepartoId);

      for (const pv of prodValues) {
        const dk = pv.record?.productionDate
          ? new Date(pv.record.productionDate).toISOString().split('T')[0]
          : null;
        if (!dk) continue;
        const anaId = deptToAna.get(pv.departmentId);
        if (anaId === undefined) continue;
        if (!gridProd.has(dk)) gridProd.set(dk, new Map());
        const dm = gridProd.get(dk)!;
        dm.set(anaId, (dm.get(anaId) || 0) + Number(pv.valore || 0));
      }
    }
  }

  const buffer = await generateProduzionePdf({
    anno,
    mese,
    meseNome,
    repartiAna,
    repartiProd,
    gridAna,
    gridProd,
    includeProduzione,
    tipoDocumento,
    linea,
  });

  fs.writeFileSync(fullPath, buffer);
  const stat = fs.statSync(fullPath);

  return {
    outputPath: fullPath,
    outputName: fileName,
    outputMime: 'application/pdf',
    outputSize: Number(stat.size),
  };
};

interface PdfData {
  anno: number;
  mese: number;
  meseNome: string;
  repartiAna: any[];
  repartiProd: any[]; // reparti ana che hanno mappatura prod
  gridAna: Map<string, Map<number, number>>;
  gridProd: Map<string, Map<number, number>>;
  includeProduzione: boolean;
  tipoDocumento?: string;
  linea?: string;
}

async function generateProduzionePdf(data: PdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const { anno, mese, meseNome, repartiAna, repartiProd, gridAna, gridProd, includeProduzione, tipoDocumento, linea } = data;

    const doc = new PDFDocument({
      margin: 20,
      size: 'A4',
      layout: 'landscape',
      autoFirstPage: true,
      info: { Title: `Produzione Mese - ${meseNome} ${anno}` },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const margin = 20;
    const pageWidth = doc.page.width - margin * 2;
    const pageHeight = doc.page.height;
    const bottomMargin = margin + 20;

    // Colori
    const C_HEADER_BG   = '#1a3a5c';
    const C_ANA_HDR     = '#2563eb';  // header blocco spedizioni
    const C_PROD_HDR    = '#7c3aed';  // header blocco produzione
    const C_WEEK_BG     = '#FFF176';
    const C_MONTH_BG    = '#FDD835';
    const C_SABATO      = '#FEF3C7';
    const C_DOMENICA    = '#F1F5F9';
    const C_ROW_ALT     = '#F8FAFF';
    const C_BORDER      = '#CBD5E1';
    const C_WHITE       = '#FFFFFF';
    const C_TEXT        = '#1a1a1a';
    const C_ZERO        = '#9CA3AF';

    const safeText = (text: string, x: number, y: number, opts?: any) => {
      doc.text(text, x, y, { lineBreak: false, ...opts });
    };

    // ---- Calcolo layout colonne ----
    const COL_DATA = 52;
    const COL_TOT  = 42;
    const SEP_W    = 8; // separatore tra blocchi

    let nAna = repartiAna.length;
    let nProd = includeProduzione ? repartiProd.length : 0;

    // Spazio disponibile per le colonne dati
    const usedFixed = COL_DATA + COL_TOT + (includeProduzione ? SEP_W + COL_TOT : 0) + (nProd > 0 ? COL_TOT : 0);
    const availableForCols = pageWidth - usedFixed;

    // Calcola colW distribuendo proporzionalmente
    const totalCols = nAna + nProd;
    const minColW = 22;
    let colW = totalCols > 0 ? Math.max(minColW, Math.floor(availableForCols / totalCols)) : 40;

    // Layout fisso
    const ROW_H    = 13;
    const HDR1_H   = 16; // header riga 1 (merge blocchi)
    const HDR2_H   = 18; // header riga 2 (nomi reparti)

    // Calcola x di inizio dei blocchi
    const xData  = margin;
    const xAna   = xData + COL_DATA;
    const xTotAna = xAna + nAna * colW;
    const xSep   = xTotAna + COL_TOT;
    const xProd  = xSep + SEP_W;
    const xTotProd = xProd + nProd * colW;
    const xGrand = xTotProd + (nProd > 0 ? COL_TOT : 0);

    const allDays = getDaysInMonth(anno, mese);
    const firstDay = allDays[0];

    // ===== HEADER PAGINA =====
    let y = margin;
    doc.rect(margin, y, pageWidth, 36).fill(C_HEADER_BG);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(14);
    safeText(includeProduzione ? 'PRODUZIONE MESE — SPEDIZIONI + PRODUZIONE' : 'PRODUZIONE MESE — SPEDIZIONI', margin + 8, y + 8);
    doc.fontSize(10).font('Helvetica');
    safeText(`${meseNome.toUpperCase()} ${anno}`, margin + 8, y + 22);
    const filtriParts: string[] = [`Generato: ${new Date().toLocaleString('it-IT')}`];
    if (tipoDocumento) filtriParts.push(`Tipo: ${tipoDocumento}`);
    if (linea) filtriParts.push(`Linea: ${linea}`);
    doc.fontSize(7);
    safeText(filtriParts.join('   |   '), xGrand + (nProd > 0 ? COL_TOT : COL_TOT) - 180, y + 15, { width: 180, align: 'right' });
    y += 42;

    // ===== FUNZIONE HEADER TABELLA =====
    const drawTableHeader = (startY: number): number => {
      let hY = startY;

      // Riga 1: DATA | PAIA SPEDITE (merge) | [sep] | PAIA PRODOTTE (merge)
      // DATA
      doc.rect(xData, hY, COL_DATA, HDR1_H).fill(C_HEADER_BG);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(6.5);
      safeText('DATA', xData + 3, hY + 4);

      // PAIA SPEDITE
      const wAnaBlock = nAna * colW + COL_TOT;
      doc.rect(xAna, hY, wAnaBlock, HDR1_H).fill(C_ANA_HDR);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(7.5);
      safeText('PAIA SPEDITE', xAna + wAnaBlock / 2 - 25, hY + 4);

      if (includeProduzione && nProd > 0) {
        // SEP
        doc.rect(xSep, hY, SEP_W, HDR1_H).fill('#F8FAFF');
        // PAIA PRODOTTE
        const wProdBlock = nProd * colW + COL_TOT;
        doc.rect(xProd, hY, wProdBlock, HDR1_H).fill(C_PROD_HDR);
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(7.5);
        safeText('PAIA PRODOTTE', xProd + wProdBlock / 2 - 28, hY + 4);
      }

      hY += HDR1_H;

      // Riga 2: nomi singoli reparti
      // DATA cell
      doc.rect(xData, hY, COL_DATA, HDR2_H).fill(C_HEADER_BG).strokeColor(C_BORDER).stroke();
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(5.5);
      safeText('GIORNO', xData + 3, hY + 5);

      // Reparti ana
      let cx = xAna;
      for (const rep of repartiAna) {
        doc.rect(cx, hY, colW, HDR2_H).fill(C_ANA_HDR).strokeColor(C_BORDER).stroke();
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(5.5);
        const lbl = (rep.codice || rep.nome).substring(0, Math.floor(colW / 3.5));
        safeText(lbl, cx + 2, hY + 5, { width: colW - 4, align: 'center' });
        cx += colW;
      }
      // TOT ANA
      doc.rect(cx, hY, COL_TOT, HDR2_H).fill(C_HEADER_BG).strokeColor(C_BORDER).stroke();
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(5.5);
      safeText('TOT.', cx + 2, hY + 5, { width: COL_TOT - 4, align: 'center' });
      cx += COL_TOT;

      if (includeProduzione && nProd > 0) {
        // SEP
        doc.rect(cx, hY, SEP_W, HDR2_H).fill('#F8FAFF');
        cx += SEP_W;
        // Reparti prod (stessi reparti ana con mappatura)
        for (const rep of repartiProd) {
          doc.rect(cx, hY, colW, HDR2_H).fill(C_PROD_HDR).strokeColor(C_BORDER).stroke();
          doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(5.5);
          const lbl = (rep.codice || rep.nome).substring(0, Math.floor(colW / 3.5));
          safeText(lbl, cx + 2, hY + 5, { width: colW - 4, align: 'center' });
          cx += colW;
        }
        // TOT PROD
        doc.rect(cx, hY, COL_TOT, HDR2_H).fill(C_PROD_HDR).strokeColor(C_BORDER).stroke();
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(5.5);
        safeText('TOT.', cx + 2, hY + 5, { width: COL_TOT - 4, align: 'center' });
      }

      return hY + HDR2_H;
    };

    // ===== FUNZIONE DRAW ROW =====
    const drawRow = (
      startY: number,
      label: string,
      dayMapAna: Map<number, number> | null,
      dayMapProd: Map<number, number> | null,
      bg: string,
      isBold: boolean,
      totAna: number,
      totProd: number,
    ): number => {
      const font = isBold ? 'Helvetica-Bold' : 'Helvetica';
      const textColor = (bg === C_WEEK_BG || bg === C_MONTH_BG) ? C_TEXT : C_TEXT;

      // DATA
      doc.rect(xData, startY, COL_DATA, ROW_H).fill(bg).strokeColor(C_BORDER).stroke();
      doc.fillColor(textColor).font(font).fontSize(6.5);
      safeText(label, xData + 3, startY + 3, { width: COL_DATA - 5 });

      // Reparti ANA
      let cx = xAna;
      for (const rep of repartiAna) {
        const qty = dayMapAna?.get(rep.id) || 0;
        doc.rect(cx, startY, colW, ROW_H).fill(bg).strokeColor(C_BORDER).stroke();
        doc.fillColor(qty === 0 ? C_ZERO : textColor).font(font).fontSize(6.5);
        safeText(qty === 0 ? '-' : String(qty), cx + 2, startY + 3, { width: colW - 4, align: 'right' });
        cx += colW;
      }
      // TOT ANA
      doc.rect(cx, startY, COL_TOT, ROW_H).fill(bg).strokeColor(C_BORDER).stroke();
      doc.fillColor(textColor).font('Helvetica-Bold').fontSize(6.5);
      safeText(totAna === 0 ? '-' : String(totAna), cx + 2, startY + 3, { width: COL_TOT - 4, align: 'right' });
      cx += COL_TOT;

      if (includeProduzione && nProd > 0) {
        // SEP
        doc.rect(cx, startY, SEP_W, ROW_H).fill('#F8FAFF');
        cx += SEP_W;
        // Reparti PROD
        for (const rep of repartiProd) {
          const qty = dayMapProd?.get(rep.id) || 0;
          doc.rect(cx, startY, colW, ROW_H).fill(bg).strokeColor(C_BORDER).stroke();
          doc.fillColor(qty === 0 ? C_ZERO : textColor).font(font).fontSize(6.5);
          safeText(qty === 0 ? '-' : String(qty), cx + 2, startY + 3, { width: colW - 4, align: 'right' });
          cx += colW;
        }
        // TOT PROD
        doc.rect(cx, startY, COL_TOT, ROW_H).fill(bg).strokeColor(C_BORDER).stroke();
        doc.fillColor(textColor).font('Helvetica-Bold').fontSize(6.5);
        safeText(totProd === 0 ? '-' : String(totProd), cx + 2, startY + 3, { width: COL_TOT - 4, align: 'right' });
      }

      return startY + ROW_H;
    };

    // ===== RENDER DATI =====
    y = drawTableHeader(y);

    let currentWeek = -1;
    let weekAna: Map<number, number> = new Map();
    let weekProd: Map<number, number> = new Map();
    let weekTotAna = 0;
    let weekTotProd = 0;
    let grandAna: Map<number, number> = new Map();
    let grandProd: Map<number, number> = new Map();
    let grandTotAna = 0;
    let grandTotProd = 0;
    let rowIdx = 0;

    const flushWeek = (wNum: number): void => {
      if (y + ROW_H > pageHeight - bottomMargin) {
        doc.addPage();
        y = margin;
        y = drawTableHeader(y);
      }
      y = drawRow(y, `TOT. SETT. ${wNum}`, weekAna, weekProd, C_WEEK_BG, true, weekTotAna, weekTotProd);
    };

    for (const day of allDays) {
      const dow = day.getDay();
      const dk = day.toISOString().split('T')[0];
      const weekNum = getWeekNumber(day, firstDay);
      const dayNum = day.getDate();
      const dayNome = GIORNI_SETTIMANA[dow];

      if (currentWeek !== -1 && weekNum !== currentWeek) {
        flushWeek(currentWeek);
        weekAna = new Map(); weekProd = new Map();
        weekTotAna = 0; weekTotProd = 0;
      }
      currentWeek = weekNum;

      const dAna = gridAna.get(dk) || new Map<number, number>();
      const dProd = gridProd.get(dk) || new Map<number, number>();
      let dTotAna = 0;
      let dTotProd = 0;

      for (const rep of repartiAna) {
        const q = dAna.get(rep.id) || 0;
        dTotAna += q;
        weekAna.set(rep.id, (weekAna.get(rep.id) || 0) + q);
        grandAna.set(rep.id, (grandAna.get(rep.id) || 0) + q);
      }
      for (const rep of repartiProd) {
        const q = dProd.get(rep.id) || 0;
        dTotProd += q;
        weekProd.set(rep.id, (weekProd.get(rep.id) || 0) + q);
        grandProd.set(rep.id, (grandProd.get(rep.id) || 0) + q);
      }
      weekTotAna += dTotAna; weekTotProd += dTotProd;
      grandTotAna += dTotAna; grandTotProd += dTotProd;

      let bg = rowIdx % 2 === 0 ? C_WHITE : C_ROW_ALT;
      if (dow === 6) bg = C_SABATO;
      if (dow === 0) bg = C_DOMENICA;

      if (y + ROW_H > pageHeight - bottomMargin) {
        doc.addPage();
        y = margin;
        y = drawTableHeader(y);
      }

      y = drawRow(y, `${dayNum} ${dayNome.substring(0, 3)}`, dAna, dProd, bg, false, dTotAna, dTotProd);
      rowIdx++;
    }

    // Ultima settimana
    if (currentWeek !== -1) flushWeek(currentWeek);

    // Totale mese
    if (y + ROW_H * 2 > pageHeight - bottomMargin) {
      doc.addPage();
      y = margin;
      y = drawTableHeader(y);
    }
    y = drawRow(y, 'TOTALE MESE', grandAna, grandProd, C_MONTH_BG, true, grandTotAna, grandTotProd);

    // Footer
    const footerY = pageHeight - 16;
    doc.fillColor('#6B7280').font('Helvetica').fontSize(6.5);
    safeText(`CoreGRE — Report Produzione Mese ${meseNome} ${anno}`, margin, footerY);

    doc.end();
  });
}

export default handler;
