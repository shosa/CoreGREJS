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
  // Settimana ISO relativa al mese: incrementa ogni volta che si passa a lunedì
  const firstMonday = new Date(firstDayOfMonth);
  // Prima settimana = tutti i giorni fino al primo sabato incluso
  const diff = day.getDate() - 1;
  const firstDow = firstDayOfMonth.getDay(); // 0=dom, 6=sab
  // Settimana 1 = dal 1° al primo sabato
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
  } = payload as ProduzioneFilters;

  const { ensureOutputPath } = helpers;
  const prisma = (helpers.trackingService as any).prisma;

  const meseNome = MESI_NOMI[mese] || `Mese ${mese}`;
  const meseStr = String(mese).padStart(2, '0');
  const fileName = `PRODUZIONE_MESE_${meseNome.toUpperCase()}_${anno}.pdf`;
  const { fullPath } = await ensureOutputPath(userId, jobId, fileName);

  // Calcola range date del mese
  const dateFrom = new Date(anno, mese - 1, 1);
  const dateTo = new Date(anno, mese, 0, 23, 59, 59, 999);

  // Fetch records del mese con repartoFinaleId
  const where: any = {
    repartoFinaleId: { not: null },
    dataDocumento: { gte: dateFrom, lte: dateTo },
  };
  if (tipoDocumento) where.tipoDocumento = tipoDocumento;
  if (linea) where.linea = linea;

  const records = await prisma.analiticaRecord.findMany({
    where,
    include: { repartoFinale: true },
    orderBy: { dataDocumento: 'asc' },
  });

  // Fetch tutti i reparti attivi ordinati
  const reparti = await prisma.analiticaReparto.findMany({
    where: { attivo: true },
    orderBy: [{ ordine: 'asc' }, { nome: 'asc' }],
  });

  // Raggruppa: data -> repartoId -> quantita totale
  const grid: Map<string, Map<number, number>> = new Map();
  for (const rec of records) {
    const dayKey = rec.dataDocumento
      ? new Date(rec.dataDocumento).toISOString().split('T')[0]
      : null;
    if (!dayKey) continue;
    if (!grid.has(dayKey)) grid.set(dayKey, new Map());
    const dayMap = grid.get(dayKey)!;
    const rId = rec.repartoFinaleId as number;
    dayMap.set(rId, (dayMap.get(rId) || 0) + Number(rec.quantita || 0));
  }

  // Totali colonna per reparto
  const totaliReparto: Map<number, number> = new Map();
  for (const [, dayMap] of grid) {
    for (const [rId, qty] of dayMap) {
      totaliReparto.set(rId, (totaliReparto.get(rId) || 0) + qty);
    }
  }

  // Totale riga per giorno
  const totaliGiorno: Map<string, number> = new Map();
  for (const [dayKey, dayMap] of grid) {
    let tot = 0;
    for (const qty of dayMap.values()) tot += qty;
    totaliGiorno.set(dayKey, tot);
  }

  const buffer = await generateProduzionePdf({
    anno,
    mese,
    meseNome,
    reparti,
    grid,
    totaliReparto,
    totaliGiorno,
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
  reparti: any[];
  grid: Map<string, Map<number, number>>;
  totaliReparto: Map<number, number>;
  totaliGiorno: Map<string, number>;
  tipoDocumento?: string;
  linea?: string;
}

async function generateProduzionePdf(data: PdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const { anno, mese, meseNome, reparti, grid, totaliReparto, totaliGiorno, tipoDocumento, linea } = data;

    // Decide orientation based on number of reparti
    const isLandscape = reparti.length > 6;

    const doc = new PDFDocument({
      margin: 25,
      size: 'A4',
      layout: isLandscape ? 'landscape' : 'portrait',
      autoFirstPage: true,
      info: {
        Title: `Produzione Mese - ${meseNome} ${anno}`,
        Author: 'CoreGRE Sistema Analitico',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const margin = 25;
    const pageWidth = doc.page.width - margin * 2;
    const pageHeight = doc.page.height;
    const bottomMargin = margin + 30;

    // Colori
    const COLOR_HEADER = '#1a3a5c';
    const COLOR_HEADER_TEXT = '#FFFFFF';
    const COLOR_WEEK_TOTAL = '#FFF176'; // giallo settimana
    const COLOR_WEEK_TEXT = '#1a1a1a';
    const COLOR_GRAND_TOTAL = '#FDD835'; // giallo totale mese
    const COLOR_GRAND_TEXT = '#1a1a1a';
    const COLOR_REPARTO_HEADER = '#2563eb';
    const COLOR_ROW_ALT = '#F8FAFF';
    const COLOR_ROW_NORM = '#FFFFFF';
    const COLOR_TEXT = '#1a1a1a';
    const COLOR_ZERO = '#9CA3AF';
    const COLOR_BORDER = '#CBD5E1';
    const COLOR_SABATO = '#FEF3C7';

    const safeText = (text: string, x: number, y: number, opts?: any) => {
      doc.text(text, x, y, { lineBreak: false, ...opts });
    };

    // Calcola layout colonne
    // Col 0 = DATA (fixed 80pt), Col 1..N = reparti, Col N+1 = TOTALE
    const COL_DATA = 80;
    const COL_TOTALE = 52;
    const available = pageWidth - COL_DATA - COL_TOTALE;
    const colW = reparti.length > 0 ? Math.floor(available / reparti.length) : available;
    const ROW_H = 14;
    const HEADER_H = 32;

    // Calcola giorni del mese con settimane
    const allDays = getDaysInMonth(anno, mese);
    const firstDay = allDays[0];

    // ==================== HEADER PAGINA ====================
    let y = margin;

    // Titolo principale
    doc.rect(margin, y, pageWidth, 40).fill(COLOR_HEADER);
    doc.fillColor(COLOR_HEADER_TEXT).font('Helvetica-Bold').fontSize(16);
    safeText('PRODUZIONE MESE', margin + 10, y + 8);
    doc.fontSize(11).font('Helvetica');
    safeText(`${meseNome.toUpperCase()} ${anno}`, margin + 10, y + 26);

    // Filtri a destra
    const filtriText: string[] = [];
    if (tipoDocumento) filtriText.push(`Tipo: ${tipoDocumento}`);
    if (linea) filtriText.push(`Linea: ${linea}`);
    filtriText.push(`Generato: ${new Date().toLocaleString('it-IT')}`);
    doc.fontSize(8).font('Helvetica');
    let fy = y + 8;
    for (const ft of filtriText) {
      safeText(ft, pageWidth - 150 + margin, fy, { width: 140, align: 'right' });
      fy += 12;
    }

    y += 48;

    // ==================== HEADER TABELLA ====================
    const drawTableHeader = (startY: number): number => {
      let hY = startY;

      // Riga header reparti
      doc.rect(margin, hY, COL_DATA, HEADER_H).fill(COLOR_HEADER).stroke(COLOR_BORDER);
      doc.fillColor(COLOR_HEADER_TEXT).font('Helvetica-Bold').fontSize(7);
      safeText('DATA', margin + 4, hY + 12);

      let hx = margin + COL_DATA;
      for (const rep of reparti) {
        doc.rect(hx, hY, colW, HEADER_H).fill(COLOR_REPARTO_HEADER).stroke(COLOR_BORDER);
        doc.fillColor(COLOR_HEADER_TEXT).font('Helvetica-Bold').fontSize(6.5);
        // Tronca nome reparto se troppo lungo
        const label = rep.codice ? `${rep.codice}` : rep.nome.substring(0, 10);
        const label2 = rep.nome.substring(0, Math.floor(colW / 4.5));
        safeText(label2, hx + 2, hY + 6, { width: colW - 4, align: 'center' });
        if (rep.codice) {
          doc.fontSize(5.5).font('Helvetica');
          safeText(`(${rep.codice})`, hx + 2, hY + 18, { width: colW - 4, align: 'center' });
        }
        hx += colW;
      }

      // Colonna TOTALE
      doc.rect(hx, hY, COL_TOTALE, HEADER_H).fill(COLOR_HEADER).stroke(COLOR_BORDER);
      doc.fillColor(COLOR_HEADER_TEXT).font('Helvetica-Bold').fontSize(7);
      safeText('TOTALE', hx + 2, hY + 12, { width: COL_TOTALE - 4, align: 'center' });

      return hY + HEADER_H;
    };

    y = drawTableHeader(y);

    // ==================== RIGHE DATI ====================
    let currentWeek = -1;
    let weekTotals: Map<number, number> = new Map(); // repartoId -> qty settimana
    let weekTotalAll = 0;
    let grandTotal: Map<number, number> = new Map();
    let grandTotalAll = 0;
    let rowIdx = 0;

    const drawRow = (
      startY: number,
      label: string,
      dayMap: Map<number, number> | null,
      bg: string,
      textColor: string,
      isBold: boolean,
      dayTotale: number,
    ): number => {
      let rx = margin;

      // Cella data
      doc.rect(rx, startY, COL_DATA, ROW_H).fill(bg).stroke(COLOR_BORDER);
      doc.fillColor(textColor).font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(7);
      safeText(label, rx + 4, startY + 3.5, { width: COL_DATA - 6 });
      rx += COL_DATA;

      // Celle reparti
      for (const rep of reparti) {
        const qty = dayMap?.get(rep.id) || 0;
        doc.rect(rx, startY, colW, ROW_H).fill(bg).stroke(COLOR_BORDER);
        doc.fillColor(qty === 0 ? COLOR_ZERO : textColor)
          .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(7);
        safeText(qty === 0 ? '-' : String(qty), rx + 2, startY + 3.5, { width: colW - 4, align: 'right' });
        rx += colW;
      }

      // Cella totale
      doc.rect(rx, startY, COL_TOTALE, ROW_H).fill(bg).stroke(COLOR_BORDER);
      doc.fillColor(textColor).font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(7);
      safeText(dayTotale === 0 ? '-' : String(dayTotale), rx + 2, startY + 3.5, {
        width: COL_TOTALE - 4,
        align: 'right',
      });

      return startY + ROW_H;
    };

    const flushWeekTotal = (startY: number, weekNum: number): number => {
      const label = `TOT. SETTIMANA ${weekNum}`;
      return drawRow(startY, label, weekTotals, COLOR_WEEK_TOTAL, COLOR_WEEK_TEXT, true, weekTotalAll);
    };

    for (const day of allDays) {
      const dow = day.getDay(); // 0=dom, 6=sab
      const dayKey = day.toISOString().split('T')[0];
      const weekNum = getWeekNumber(day, firstDay);
      const dayNome = GIORNI_SETTIMANA[dow];
      const dayNum = day.getDate();

      // Nuova settimana: se siamo già su una settimana precedente, stampa totale
      if (currentWeek !== -1 && weekNum !== currentWeek) {
        // controlla spazio
        if (y + ROW_H > pageHeight - bottomMargin) {
          doc.addPage();
          y = margin;
          y = drawTableHeader(y);
        }
        y = flushWeekTotal(y, currentWeek);
        weekTotals = new Map();
        weekTotalAll = 0;
      }
      currentWeek = weekNum;

      const dayMap = grid.get(dayKey) || new Map<number, number>();
      const dayTot = totaliGiorno.get(dayKey) || 0;

      // Accumula settimana e totale mese
      for (const rep of reparti) {
        const qty = dayMap.get(rep.id) || 0;
        weekTotals.set(rep.id, (weekTotals.get(rep.id) || 0) + qty);
        grandTotal.set(rep.id, (grandTotal.get(rep.id) || 0) + qty);
      }
      weekTotalAll += dayTot;
      grandTotalAll += dayTot;

      // Background sabato/domenica
      let bg = rowIdx % 2 === 0 ? COLOR_ROW_NORM : COLOR_ROW_ALT;
      if (dow === 6) bg = COLOR_SABATO; // sabato giallino
      if (dow === 0) bg = '#F1F5F9'; // domenica grigio

      // Label giorno
      const label = `${dayNum} ${dayNome.substring(0, 3)}`;

      if (y + ROW_H > pageHeight - bottomMargin) {
        doc.addPage();
        y = margin;
        y = drawTableHeader(y);
      }

      y = drawRow(y, label, dayMap, bg, COLOR_TEXT, false, dayTot);
      rowIdx++;
    }

    // Ultima settimana
    if (currentWeek !== -1) {
      if (y + ROW_H > pageHeight - bottomMargin) {
        doc.addPage();
        y = margin;
        y = drawTableHeader(y);
      }
      y = flushWeekTotal(y, currentWeek);
    }

    // Spazio prima del totale mese
    if (y + ROW_H * 2 > pageHeight - bottomMargin) {
      doc.addPage();
      y = margin;
      y = drawTableHeader(y);
    }

    // Riga TOTALE MESE
    y = drawRow(y, 'TOTALE MESE', grandTotal, COLOR_GRAND_TOTAL, COLOR_GRAND_TEXT, true, grandTotalAll);

    // ==================== FOOTER ====================
    const footerY = pageHeight - 22;
    doc.fillColor('#6B7280').font('Helvetica').fontSize(7);
    safeText(`CoreGRE - Report Produzione Mese ${meseNome} ${anno}`, margin, footerY);
    safeText(`Pag. 1`, pageWidth + margin - 40, footerY, { align: 'right' });

    doc.end();
  });
}

export default handler;
