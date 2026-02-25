import * as ExcelJS from 'exceljs';
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
  } = payload as ProduzioneFilters;

  const { ensureOutputPath } = helpers;
  const prisma = (helpers.trackingService as any).prisma;

  const meseNome = MESI_NOMI[mese] || `Mese ${mese}`;
  const fileName = `PRODUZIONE_MESE_${meseNome.toUpperCase()}_${anno}.xlsx`;
  const { fullPath } = await ensureOutputPath(userId, jobId, fileName);

  // Calcola range date del mese
  const dateFrom = new Date(anno, mese - 1, 1);
  const dateTo = new Date(anno, mese, 0, 23, 59, 59, 999);

  // Fetch records
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

  // Fetch reparti attivi
  const reparti = await prisma.analiticaReparto.findMany({
    where: { attivo: true },
    orderBy: [{ ordine: 'asc' }, { nome: 'asc' }],
  });

  // Raggruppa: dayKey -> repartoId -> qty
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

  // Crea workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CoreGRE';
  workbook.created = new Date();

  const ws = workbook.addWorksheet(`Produzione ${meseNome} ${anno}`, {
    pageSetup: {
      paperSize: 9, // A4
      orientation: reparti.length > 6 ? 'landscape' : 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
    views: [{ state: 'frozen', xSplit: 2, ySplit: 3 }],
  });

  // ==================== STILI ====================
  const styleHeader: Partial<ExcelJS.Style> = {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a3a5c' } },
    font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    },
  };

  const styleRepartoHeader: Partial<ExcelJS.Style> = {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563eb' } },
    font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 9 },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    },
  };

  const styleCellNorm: Partial<ExcelJS.Style> = {
    alignment: { horizontal: 'right', vertical: 'middle' },
    border: {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    },
    font: { size: 9 },
  };

  const styleCellZero: Partial<ExcelJS.Style> = {
    ...styleCellNorm,
    font: { color: { argb: 'FF9CA3AF' }, size: 9 },
  };

  const styleWeekTotal: Partial<ExcelJS.Style> = {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF176' } },
    font: { bold: true, size: 9 },
    alignment: { horizontal: 'right', vertical: 'middle' },
    border: {
      top: { style: 'medium', color: { argb: 'FF1a1a1a' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF1a1a1a' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    },
  };

  const styleWeekTotalLabel: Partial<ExcelJS.Style> = {
    ...styleWeekTotal,
    alignment: { horizontal: 'left', vertical: 'middle' },
  };

  const styleGrandTotal: Partial<ExcelJS.Style> = {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDD835' } },
    font: { bold: true, size: 10 },
    alignment: { horizontal: 'right', vertical: 'middle' },
    border: {
      top: { style: 'medium', color: { argb: 'FF1a1a1a' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF1a1a1a' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    },
  };

  const styleGrandTotalLabel: Partial<ExcelJS.Style> = {
    ...styleGrandTotal,
    alignment: { horizontal: 'left', vertical: 'middle' },
  };

  const styleSabato: Partial<ExcelJS.Style> = {
    ...styleCellNorm,
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } },
  };

  const styleDomenica: Partial<ExcelJS.Style> = {
    ...styleCellNorm,
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } },
    font: { color: { argb: 'FF9CA3AF' }, size: 9 },
  };

  const styleDateNorm: Partial<ExcelJS.Style> = {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } },
    alignment: { horizontal: 'left', vertical: 'middle' },
    border: {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    },
    font: { size: 9 },
  };

  const styleDateSab: Partial<ExcelJS.Style> = {
    ...styleDateNorm,
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } },
  };

  const styleDateDom: Partial<ExcelJS.Style> = {
    ...styleDateNorm,
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } },
    font: { color: { argb: 'FF9CA3AF' }, size: 9 },
  };

  // ==================== LARGHEZZE COLONNE ====================
  // Col A = numero giorno, Col B = nome giorno, Col C..C+N = reparti, Col last = TOTALE
  ws.getColumn(1).width = 6;  // Num
  ws.getColumn(2).width = 12; // Giorno
  for (let i = 0; i < reparti.length; i++) {
    ws.getColumn(3 + i).width = 10;
  }
  ws.getColumn(3 + reparti.length).width = 10; // TOTALE

  // ==================== RIGA 1: TITOLO ====================
  const totalCols = 2 + reparti.length + 1;
  ws.mergeCells(1, 1, 1, totalCols);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = `PRODUZIONE MESE - ${meseNome.toUpperCase()} ${anno}`;
  titleCell.style = {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a3a5c' } },
    font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 14 },
    alignment: { horizontal: 'center', vertical: 'middle' },
  };
  ws.getRow(1).height = 28;

  // ==================== RIGA 2: FILTRI ====================
  ws.mergeCells(2, 1, 2, totalCols);
  const filtriParts: string[] = [`Generato: ${new Date().toLocaleString('it-IT')}`];
  if (tipoDocumento) filtriParts.push(`Tipo Documento: ${tipoDocumento}`);
  if (linea) filtriParts.push(`Linea: ${linea}`);
  ws.getCell(2, 1).value = filtriParts.join('   |   ');
  ws.getCell(2, 1).style = {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF7' } },
    font: { size: 8, italic: true },
    alignment: { horizontal: 'center', vertical: 'middle' },
  };
  ws.getRow(2).height = 16;

  // ==================== RIGA 3: INTESTAZIONI COLONNE ====================
  ws.getCell(3, 1).value = 'N.';
  ws.getCell(3, 1).style = styleHeader;
  ws.getCell(3, 2).value = 'GIORNO';
  ws.getCell(3, 2).style = styleHeader;

  ws.mergeCells(3, 3, 3, 2 + reparti.length);
  ws.getCell(3, 3).value = 'PAIA PRODOTTE';
  ws.getCell(3, 3).style = {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563eb' } },
    font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    },
  };
  ws.getCell(3, 3 + reparti.length).value = 'TOTALE';
  ws.getCell(3, 3 + reparti.length).style = styleHeader;
  ws.getRow(3).height = 20;

  // ==================== RIGA 4 (sub-header): nomi reparti ====================
  ws.getCell(4, 1).value = '';
  ws.getCell(4, 1).style = styleHeader;
  ws.getCell(4, 2).value = '';
  ws.getCell(4, 2).style = styleHeader;

  for (let i = 0; i < reparti.length; i++) {
    const rep = reparti[i];
    const cell = ws.getCell(4, 3 + i);
    cell.value = rep.codice ? `${rep.nome}\n(${rep.codice})` : rep.nome;
    cell.style = styleRepartoHeader;
  }
  ws.getCell(4, 3 + reparti.length).value = '';
  ws.getCell(4, 3 + reparti.length).style = styleHeader;
  ws.getRow(4).height = 28;

  // ==================== RIGHE DATI ====================
  const allDays = getDaysInMonth(anno, mese);
  const firstDay = allDays[0];

  let currentWeek = -1;
  let weekTotals: Map<number, number> = new Map();
  let weekTotalAll = 0;
  let grandTotal: Map<number, number> = new Map();
  let grandTotalAll = 0;
  let excelRow = 5;

  const addWeekTotalRow = (weekNum: number) => {
    const rowData: any[] = [`TOT. SETTIMANA ${weekNum}`, ''];
    for (const rep of reparti) {
      rowData.push(weekTotals.get(rep.id) || 0);
    }
    rowData.push(weekTotalAll);

    const row = ws.getRow(excelRow);
    row.getCell(1).value = rowData[0];
    row.getCell(1).style = styleWeekTotalLabel;
    ws.mergeCells(excelRow, 1, excelRow, 2);
    for (let i = 0; i < reparti.length; i++) {
      const cell = row.getCell(3 + i);
      cell.value = rowData[2 + i];
      cell.style = styleWeekTotal;
    }
    const totCell = row.getCell(3 + reparti.length);
    totCell.value = weekTotalAll;
    totCell.style = styleWeekTotal;
    row.height = 16;
    excelRow++;
  };

  for (const day of allDays) {
    const dow = day.getDay();
    const dayKey = day.toISOString().split('T')[0];
    const weekNum = getWeekNumber(day, firstDay);
    const dayNome = GIORNI_SETTIMANA[dow];
    const dayNum = day.getDate();

    if (currentWeek !== -1 && weekNum !== currentWeek) {
      addWeekTotalRow(currentWeek);
      weekTotals = new Map();
      weekTotalAll = 0;
    }
    currentWeek = weekNum;

    const dayMap = grid.get(dayKey) || new Map<number, number>();
    let dayTot = 0;
    for (const rep of reparti) {
      const qty = dayMap.get(rep.id) || 0;
      dayTot += qty;
      weekTotals.set(rep.id, (weekTotals.get(rep.id) || 0) + qty);
      grandTotal.set(rep.id, (grandTotal.get(rep.id) || 0) + qty);
    }
    weekTotalAll += dayTot;
    grandTotalAll += dayTot;

    // Scegli stile riga in base al giorno
    let cellStyle = styleCellNorm;
    let dateStyle = styleDateNorm;
    if (dow === 6) { cellStyle = styleSabato; dateStyle = styleDateSab; }
    if (dow === 0) { cellStyle = styleDomenica; dateStyle = styleDateDom; }

    const row = ws.getRow(excelRow);
    row.getCell(1).value = dayNum;
    row.getCell(1).style = { ...dateStyle, alignment: { horizontal: 'center', vertical: 'middle' } };
    row.getCell(2).value = dayNome;
    row.getCell(2).style = dateStyle;

    for (let i = 0; i < reparti.length; i++) {
      const qty = dayMap.get(reparti[i].id) || 0;
      const cell = row.getCell(3 + i);
      cell.value = qty === 0 ? null : qty;
      cell.style = qty === 0 ? { ...cellStyle, ...styleCellZero } : cellStyle;
    }

    const totCell = row.getCell(3 + reparti.length);
    totCell.value = dayTot === 0 ? null : dayTot;
    totCell.style = { ...cellStyle, font: { bold: true, size: 9 } };

    row.height = 14;
    excelRow++;
  }

  // Ultima settimana
  if (currentWeek !== -1) {
    addWeekTotalRow(currentWeek);
  }

  // ==================== RIGA TOTALE MESE ====================
  const grandRow = ws.getRow(excelRow);
  grandRow.getCell(1).value = 'TOTALE MESE';
  grandRow.getCell(1).style = styleGrandTotalLabel;
  ws.mergeCells(excelRow, 1, excelRow, 2);
  for (let i = 0; i < reparti.length; i++) {
    const cell = grandRow.getCell(3 + i);
    cell.value = grandTotal.get(reparti[i].id) || 0;
    cell.style = styleGrandTotal;
  }
  const grandTotCell = grandRow.getCell(3 + reparti.length);
  grandTotCell.value = grandTotalAll;
  grandTotCell.style = styleGrandTotal;
  grandRow.height = 18;

  // ==================== SALVA ====================
  await workbook.xlsx.writeFile(fullPath);
  const stat = fs.statSync(fullPath);

  return {
    outputPath: fullPath,
    outputName: fileName,
    outputMime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    outputSize: Number(stat.size),
  };
};

export default handler;
