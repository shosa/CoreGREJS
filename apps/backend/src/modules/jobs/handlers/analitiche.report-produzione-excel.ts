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
    includeProduzione,
  } = payload as ProduzioneFilters;

  const { ensureOutputPath } = helpers;
  const prisma = (helpers.trackingService as any).prisma;

  const meseNome = MESI_NOMI[mese] || `Mese ${mese}`;
  const fileName = `PRODUZIONE_MESE_${meseNome.toUpperCase()}_${anno}.xlsx`;
  const { fullPath } = await ensureOutputPath(userId, jobId, fileName);

  // Calcola range date del mese
  const dateFrom = new Date(anno, mese - 1, 1);
  const dateTo = new Date(anno, mese, 0, 23, 59, 59, 999);

  // ── Fetch spedizioni (ana_records) ──────────────────────────────────────────
  const whereAna: any = {
    repartoFinaleId: { not: null },
    dataDocumento: { gte: dateFrom, lte: dateTo },
  };
  if (tipoDocumento) whereAna.tipoDocumento = tipoDocumento;
  if (linea) whereAna.linea = linea;

  const records = await prisma.analiticaRecord.findMany({
    where: whereAna,
    include: { repartoFinale: true },
    orderBy: { dataDocumento: 'asc' },
  });

  // Fetch reparti analitici attivi
  const reparti = await prisma.analiticaReparto.findMany({
    where: { attivo: true },
    orderBy: [{ ordine: 'asc' }, { nome: 'asc' }],
  });

  // grid spedizioni: dayKey → repartoId → qty
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

  // ── Fetch produzione (se richiesto) ────────────────────────────────────────
  // gridProd: dayKey → anaRepartoId → qty
  const gridProd: Map<string, Map<number, number>> = new Map();
  // repartiProd = subset di reparti che hanno mappature (stesso ordine)
  let repartiProd: typeof reparti = [];

  if (includeProduzione) {
    // Leggi mappature
    const mappings = await prisma.analiticaRepartoMapping.findMany({
      include: { prodDepartment: true },
    });

    // anaRepartoId → prodDeptId[]
    const anaToProds = new Map<number, number[]>();
    for (const m of mappings) {
      if (!anaToProds.has(m.analiticaRepartoId)) anaToProds.set(m.analiticaRepartoId, []);
      anaToProds.get(m.analiticaRepartoId)!.push(m.prodDepartmentId);
    }

    // Reparti che hanno almeno una mappatura (stesso ordine dei repartiAna)
    repartiProd = reparti.filter((r: any) => anaToProds.has(r.id));

    if (repartiProd.length > 0) {
      const allMappedDeptIds = [...new Set(mappings.map((m: any) => m.prodDepartmentId))];

      const prodValues = await prisma.productionValue.findMany({
        where: {
          record: { productionDate: { gte: dateFrom, lte: dateTo } },
          departmentId: { in: allMappedDeptIds },
        },
        include: { record: true },
      });

      for (const pv of prodValues) {
        const dayKey = pv.record?.productionDate
          ? new Date(pv.record.productionDate).toISOString().split('T')[0]
          : null;
        if (!dayKey) continue;

        // Trova anaRepartoId corrispondente
        const anaRepartoId = [...anaToProds.entries()].find(([, depts]) =>
          depts.includes(pv.departmentId),
        )?.[0];
        if (anaRepartoId === undefined) continue;

        if (!gridProd.has(dayKey)) gridProd.set(dayKey, new Map());
        const dayMap = gridProd.get(dayKey)!;
        dayMap.set(anaRepartoId, (dayMap.get(anaRepartoId) || 0) + Number(pv.quantity || 0));
      }
    }
  }

  // ── Costruisci workbook ────────────────────────────────────────────────────
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CoreGRE';
  workbook.created = new Date();

  const nAna = reparti.length;
  const nProd = repartiProd.length;
  const hasProd = includeProduzione && nProd > 0;

  // Calcolo colonne:
  // 1=N, 2=Giorno, 3..2+nAna=reparti ana, 3+nAna=TOT_ANA
  // se hasProd: 3+nAna+1=SEP, 3+nAna+2..3+nAna+1+nProd=reparti prod, 3+nAna+2+nProd=TOT_PROD
  const colTotAna = 3 + nAna;        // indice 1-based
  const colSep    = colTotAna + 1;   // separator (solo se hasProd)
  const colProd0  = colTotAna + 2;   // prima col prod
  const colTotProd = colProd0 + nProd; // TOT prod (solo se hasProd)
  const totalCols = hasProd ? colTotProd : colTotAna;

  const ws = workbook.addWorksheet(`Produzione ${meseNome} ${anno}`, {
    pageSetup: {
      paperSize: 9,
      orientation: totalCols > 12 ? 'landscape' : 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
    views: [{ state: 'frozen', xSplit: 2, ySplit: hasProd ? 4 : 3 }],
  });

  // ── Stili ──────────────────────────────────────────────────────────────────
  const border = (c = 'FFCBD5E1') => ({
    top: { style: 'thin' as const, color: { argb: c } },
    left: { style: 'thin' as const, color: { argb: c } },
    bottom: { style: 'thin' as const, color: { argb: c } },
    right: { style: 'thin' as const, color: { argb: c } },
  });

  const styleHeader: Partial<ExcelJS.Style> = {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a3a5c' } },
    font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: border(),
  };

  const styleAnaHeader: Partial<ExcelJS.Style> = {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563eb' } },
    font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 9 },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: border(),
  };

  const styleProdHeader: Partial<ExcelJS.Style> = {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7c3aed' } },
    font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 9 },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: border(),
  };

  const styleSep: Partial<ExcelJS.Style> = {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } },
    border: {},
  };

  const styleCellNorm: Partial<ExcelJS.Style> = {
    alignment: { horizontal: 'right', vertical: 'middle' },
    border: border(),
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
    border: border(),
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

  // ── Larghezze colonne ──────────────────────────────────────────────────────
  ws.getColumn(1).width = 6;   // N
  ws.getColumn(2).width = 12;  // Giorno
  for (let i = 0; i < nAna; i++) ws.getColumn(3 + i).width = 10;
  ws.getColumn(colTotAna).width = 10; // TOT ANA
  if (hasProd) {
    ws.getColumn(colSep).width = 2;    // separatore
    for (let i = 0; i < nProd; i++) ws.getColumn(colProd0 + i).width = 10;
    ws.getColumn(colTotProd).width = 10; // TOT PROD
  }

  // ── Riga 1: Titolo ──────────────────────────────────────────────────────────
  ws.mergeCells(1, 1, 1, totalCols);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = `PRODUZIONE MESE - ${meseNome.toUpperCase()} ${anno}`;
  titleCell.style = {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a3a5c' } },
    font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 14 },
    alignment: { horizontal: 'center', vertical: 'middle' },
  };
  ws.getRow(1).height = 28;

  // ── Riga 2: Filtri ─────────────────────────────────────────────────────────
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

  if (!hasProd) {
    // ── Layout semplice (solo spedizioni) ──────────────────────────────────
    // Riga 3: intestazione con merge PAIA PRODOTTE
    ws.getCell(3, 1).value = 'N.';
    ws.getCell(3, 1).style = styleHeader;
    ws.getCell(3, 2).value = 'GIORNO';
    ws.getCell(3, 2).style = styleHeader;

    ws.mergeCells(3, 3, 3, 2 + nAna);
    ws.getCell(3, 3).value = 'PAIA PRODOTTE';
    ws.getCell(3, 3).style = {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563eb' } },
      font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: border(),
    };
    ws.getCell(3, colTotAna).value = 'TOTALE';
    ws.getCell(3, colTotAna).style = styleHeader;
    ws.getRow(3).height = 20;

    // Riga 4: nomi reparti
    ws.getCell(4, 1).value = '';
    ws.getCell(4, 1).style = styleHeader;
    ws.getCell(4, 2).value = '';
    ws.getCell(4, 2).style = styleHeader;
    for (let i = 0; i < nAna; i++) {
      const rep = reparti[i];
      const cell = ws.getCell(4, 3 + i);
      cell.value = rep.codice ? `${rep.nome}\n(${rep.codice})` : rep.nome;
      cell.style = styleAnaHeader;
    }
    ws.getCell(4, colTotAna).value = '';
    ws.getCell(4, colTotAna).style = styleHeader;
    ws.getRow(4).height = 28;

  } else {
    // ── Layout combinato (spedizioni + produzione) ─────────────────────────
    // Riga 3 — header doppio riga 1: etichette blocco
    ws.getCell(3, 1).value = 'N.';
    ws.getCell(3, 1).style = styleHeader;
    ws.mergeCells(3, 1, 4, 1); // span 2 righe
    ws.getCell(3, 2).value = 'GIORNO';
    ws.getCell(3, 2).style = styleHeader;
    ws.mergeCells(3, 2, 4, 2); // span 2 righe

    // Merge "PAIA SPEDITE" su N blocco ana
    ws.mergeCells(3, 3, 3, colTotAna);
    ws.getCell(3, 3).value = 'PAIA SPEDITE';
    ws.getCell(3, 3).style = {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563eb' } },
      font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: border(),
    };

    // Sep header
    ws.getCell(3, colSep).value = '';
    ws.getCell(3, colSep).style = styleSep;
    ws.mergeCells(3, colSep, 4, colSep); // span 2 righe

    // Merge "PAIA PRODOTTE" su N blocco prod
    ws.mergeCells(3, colProd0, 3, colTotProd);
    ws.getCell(3, colProd0).value = 'PAIA PRODOTTE';
    ws.getCell(3, colProd0).style = {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7c3aed' } },
      font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: border(),
    };

    ws.getRow(3).height = 20;

    // Riga 4 — header riga 2: nomi singoli reparti
    for (let i = 0; i < nAna; i++) {
      const rep = reparti[i];
      const cell = ws.getCell(4, 3 + i);
      cell.value = rep.codice ? `${rep.nome}\n(${rep.codice})` : rep.nome;
      cell.style = styleAnaHeader;
    }
    ws.getCell(4, colTotAna).value = 'TOTALE';
    ws.getCell(4, colTotAna).style = styleAnaHeader;

    for (let i = 0; i < nProd; i++) {
      const rep = repartiProd[i];
      const cell = ws.getCell(4, colProd0 + i);
      cell.value = rep.codice ? `${rep.nome}\n(${rep.codice})` : rep.nome;
      cell.style = styleProdHeader;
    }
    ws.getCell(4, colTotProd).value = 'TOTALE';
    ws.getCell(4, colTotProd).style = styleProdHeader;

    ws.getRow(4).height = 28;
  }

  // ── Righe dati ─────────────────────────────────────────────────────────────
  const allDays = getDaysInMonth(anno, mese);
  const firstDay = allDays[0];

  let currentWeek = -1;
  let weekTotalsAna: Map<number, number> = new Map();
  let weekTotalAllAna = 0;
  let grandTotalAna: Map<number, number> = new Map();
  let grandTotalAllAna = 0;

  let weekTotalsProd: Map<number, number> = new Map();
  let weekTotalAllProd = 0;
  let grandTotalProd: Map<number, number> = new Map();
  let grandTotalAllProd = 0;

  let excelRow = 5;

  const applyWeekSepStyle = (row: ExcelJS.Row, col: number) => {
    if (hasProd) {
      row.getCell(colSep).style = {
        ...styleSep,
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } },
      };
    }
  };

  const addWeekTotalRow = (weekNum: number) => {
    const row = ws.getRow(excelRow);

    row.getCell(1).value = `TOT. SETTIMANA ${weekNum}`;
    row.getCell(1).style = styleWeekTotalLabel;
    ws.mergeCells(excelRow, 1, excelRow, 2);

    for (let i = 0; i < nAna; i++) {
      const cell = row.getCell(3 + i);
      cell.value = weekTotalsAna.get(reparti[i].id) || 0;
      cell.style = styleWeekTotal;
    }
    row.getCell(colTotAna).value = weekTotalAllAna;
    row.getCell(colTotAna).style = styleWeekTotal;

    if (hasProd) {
      row.getCell(colSep).style = styleSep;
      for (let i = 0; i < nProd; i++) {
        const cell = row.getCell(colProd0 + i);
        cell.value = weekTotalsProd.get(repartiProd[i].id) || 0;
        cell.style = styleWeekTotal;
      }
      row.getCell(colTotProd).value = weekTotalAllProd;
      row.getCell(colTotProd).style = styleWeekTotal;
    }

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
      weekTotalsAna = new Map();
      weekTotalAllAna = 0;
      weekTotalsProd = new Map();
      weekTotalAllProd = 0;
    }
    currentWeek = weekNum;

    const dayMapAna = grid.get(dayKey) || new Map<number, number>();
    const dayMapProd = gridProd.get(dayKey) || new Map<number, number>();

    let dayTotAna = 0;
    for (const rep of reparti) {
      const qty = dayMapAna.get(rep.id) || 0;
      dayTotAna += qty;
      weekTotalsAna.set(rep.id, (weekTotalsAna.get(rep.id) || 0) + qty);
      grandTotalAna.set(rep.id, (grandTotalAna.get(rep.id) || 0) + qty);
    }
    weekTotalAllAna += dayTotAna;
    grandTotalAllAna += dayTotAna;

    let dayTotProd = 0;
    if (hasProd) {
      for (const rep of repartiProd) {
        const qty = dayMapProd.get(rep.id) || 0;
        dayTotProd += qty;
        weekTotalsProd.set(rep.id, (weekTotalsProd.get(rep.id) || 0) + qty);
        grandTotalProd.set(rep.id, (grandTotalProd.get(rep.id) || 0) + qty);
      }
      weekTotalAllProd += dayTotProd;
      grandTotalAllProd += dayTotProd;
    }

    let cellStyle = styleCellNorm;
    let dateStyle = styleDateNorm;
    if (dow === 6) { cellStyle = styleSabato; dateStyle = styleDateSab; }
    if (dow === 0) { cellStyle = styleDomenica; dateStyle = styleDateDom; }

    const row = ws.getRow(excelRow);
    row.getCell(1).value = dayNum;
    row.getCell(1).style = { ...dateStyle, alignment: { horizontal: 'center', vertical: 'middle' } };
    row.getCell(2).value = dayNome;
    row.getCell(2).style = dateStyle;

    for (let i = 0; i < nAna; i++) {
      const qty = dayMapAna.get(reparti[i].id) || 0;
      const cell = row.getCell(3 + i);
      cell.value = qty === 0 ? null : qty;
      cell.style = qty === 0 ? { ...cellStyle, ...styleCellZero } : cellStyle;
    }
    const totAnaCell = row.getCell(colTotAna);
    totAnaCell.value = dayTotAna === 0 ? null : dayTotAna;
    totAnaCell.style = { ...cellStyle, font: { bold: true, size: 9 } };

    if (hasProd) {
      row.getCell(colSep).style = styleSep;
      for (let i = 0; i < nProd; i++) {
        const qty = dayMapProd.get(repartiProd[i].id) || 0;
        const cell = row.getCell(colProd0 + i);
        cell.value = qty === 0 ? null : qty;
        cell.style = qty === 0 ? { ...cellStyle, ...styleCellZero } : cellStyle;
      }
      const totProdCell = row.getCell(colTotProd);
      totProdCell.value = dayTotProd === 0 ? null : dayTotProd;
      totProdCell.style = { ...cellStyle, font: { bold: true, size: 9 } };
    }

    row.height = 14;
    excelRow++;
  }

  // Ultima settimana
  if (currentWeek !== -1) {
    addWeekTotalRow(currentWeek);
  }

  // ── Totale mese ───────────────────────────────────────────────────────────
  const grandRow = ws.getRow(excelRow);
  grandRow.getCell(1).value = 'TOTALE MESE';
  grandRow.getCell(1).style = styleGrandTotalLabel;
  ws.mergeCells(excelRow, 1, excelRow, 2);

  for (let i = 0; i < nAna; i++) {
    const cell = grandRow.getCell(3 + i);
    cell.value = grandTotalAna.get(reparti[i].id) || 0;
    cell.style = styleGrandTotal;
  }
  grandRow.getCell(colTotAna).value = grandTotalAllAna;
  grandRow.getCell(colTotAna).style = styleGrandTotal;

  if (hasProd) {
    grandRow.getCell(colSep).style = styleSep;
    for (let i = 0; i < nProd; i++) {
      const cell = grandRow.getCell(colProd0 + i);
      cell.value = grandTotalProd.get(repartiProd[i].id) || 0;
      cell.style = styleGrandTotal;
    }
    grandRow.getCell(colTotProd).value = grandTotalAllProd;
    grandRow.getCell(colTotProd).style = styleGrandTotal;
  }

  grandRow.height = 18;

  // ── Salva ─────────────────────────────────────────────────────────────────
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
