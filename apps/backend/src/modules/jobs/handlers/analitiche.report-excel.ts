import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import { JobHandler } from '../types';

interface ReportFilters {
  userId: number;
  jobId: string;
  dataFrom?: string;
  dataTo?: string;
  repartoId?: number;
  tipoDocumento?: string;
  linea?: string;
  includeDetails?: boolean;
  showUncorrelatedCosts?: boolean;
  showCostoTomaia?: boolean;
}

// Mappa dei nomi dei campi costo
const COST_FIELDS = ['costoTaglio', 'costoOrlatura', 'costoStrobel', 'altriCosti', 'costoMontaggio'];

/**
 * Calcola i costi applicabili per un record in base a:
 * - costiAssociati del reparto finale (se presente e showUncorrelatedCosts = false)
 * - prodottoEstero (se true, esclude taglio e orlatura MA se showCostoTomaia aggiunge costoTomaia)
 * - showCostoTomaia (se true e prodottoEstero, aggiunge Costo Tomaia = Taglio + Orlatura)
 */
function getApplicableCosts(
  record: any,
  repartoMap: Map<number, any>,
  showUncorrelatedCosts: boolean = false,
  showCostoTomaia: boolean = false,
): { costs: Record<string, number>; totalCosto: number; fatturato: number; costoTomaia: number } {
  const qty = Number(record.quantita) || 0;
  const prezzoUnit = Number(record.prezzoUnitario) || 0;
  const fatturato = qty * prezzoUnit;

  // Ottieni i costi associati al reparto finale
  const repartoFinale = record.repartoFinaleId ? repartoMap.get(record.repartoFinaleId) : null;
  let costiAssociati: string[] | null = null;

  if (!showUncorrelatedCosts && repartoFinale?.costiAssociati) {
    try {
      costiAssociati = typeof repartoFinale.costiAssociati === 'string'
        ? JSON.parse(repartoFinale.costiAssociati)
        : repartoFinale.costiAssociati;
    } catch {
      costiAssociati = null;
    }
  }

  const costs: Record<string, number> = {};
  let totalCosto = 0;
  let costoTomaia = 0;

  // Calcola Costo Tomaia per prodotti esteri (Taglio + Orlatura) * qty
  if (showCostoTomaia && record.prodottoEstero === true) {
    const costoTaglioUnit = Number(record.costoTaglio) || 0;
    const costoOrlaturaUnit = Number(record.costoOrlatura) || 0;
    costoTomaia = (costoTaglioUnit + costoOrlaturaUnit) * qty;
  }

  COST_FIELDS.forEach((field) => {
    let costoUnit = Number(record[field]) || 0;

    // Se prodotto estero, escludi taglio e orlatura (vengono sommati in costoTomaia se showCostoTomaia)
    if (record.prodottoEstero === true && (field === 'costoTaglio' || field === 'costoOrlatura')) {
      costoUnit = 0;
    }

    // Se ci sono costi associati configurati e non showUncorrelatedCosts, verifica che questo campo sia incluso
    if (!showUncorrelatedCosts && costiAssociati && costiAssociati.length > 0 && !costiAssociati.includes(field)) {
      costoUnit = 0;
    }

    const costoTotale = costoUnit * qty;
    costs[field] = costoTotale;
    totalCosto += costoTotale;
  });

  // Aggiungi costo tomaia al totale
  totalCosto += costoTomaia;

  return { costs, totalCosto, fatturato, costoTomaia };
}

const handler: JobHandler = async (payload, helpers) => {
  const {
    userId,
    jobId,
    dataFrom,
    dataTo,
    repartoId,
    tipoDocumento,
    linea,
    includeDetails = false,
    showUncorrelatedCosts = false,
    showCostoTomaia = false,
  } = payload as ReportFilters;

  const { trackingService, ensureOutputPath } = helpers;
  const prisma = (trackingService as any).prisma;

  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `REPORT_ANALITICHE_${dateStr}.xlsx`;
  const { fullPath } = await ensureOutputPath(userId, jobId, fileName);

  // Build query filters - IMPORTANTE: solo record con repartoFinaleId
  const where: any = {
    repartoFinaleId: { not: null },
  };
  if (dataFrom || dataTo) {
    where.dataDocumento = {};
    if (dataFrom) where.dataDocumento.gte = new Date(dataFrom);
    if (dataTo) {
      const endDate = new Date(dataTo);
      endDate.setHours(23, 59, 59, 999);
      where.dataDocumento.lte = endDate;
    }
  }
  if (repartoId) where.repartoFinaleId = repartoId;
  if (tipoDocumento) where.tipoDocumento = tipoDocumento;
  if (linea) where.linea = linea;

  // Fetch records with relations
  const records = await prisma.analiticaRecord.findMany({
    where,
    include: {
      reparto: true,
      repartoFinale: true,
    },
    orderBy: { dataDocumento: 'desc' },
  });

  // Count excluded records
  const totalRecordsCount = await prisma.analiticaRecord.count({
    where: {
      ...(dataFrom || dataTo ? {
        dataDocumento: {
          ...(dataFrom ? { gte: new Date(dataFrom) } : {}),
          ...(dataTo ? { lte: new Date(dataTo) } : {}),
        }
      } : {}),
      ...(tipoDocumento ? { tipoDocumento } : {}),
      ...(linea ? { linea } : {}),
    }
  });
  const excludedCount = totalRecordsCount - records.length;

  // Get all reparti
  const reparti = await prisma.analiticaReparto.findMany({
    orderBy: { ordine: 'asc' },
  });
  const repartoMap: Map<number, any> = new Map(
    reparti.map((r: any) => [r.id as number, r]),
  );

  // Create workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CoreGRE';
  workbook.created = new Date();

  // ==================== SHEET 1: Riepilogo ====================
  const summarySheet = workbook.addWorksheet('Riepilogo');

  // Title
  summarySheet.mergeCells('A1:G1');
  summarySheet.getCell('A1').value = 'REPORT ANALISI COSTI';
  summarySheet.getCell('A1').font = { bold: true, size: 16 };
  summarySheet.getCell('A1').alignment = { horizontal: 'center' };

  // Date
  summarySheet.mergeCells('A2:G2');
  summarySheet.getCell('A2').value = `Generato il: ${new Date().toLocaleString('it-IT')}`;
  summarySheet.getCell('A2').alignment = { horizontal: 'center' };

  // Filters
  let row = 4;
  summarySheet.getCell(`A${row}`).value = 'Filtri Applicati:';
  summarySheet.getCell(`A${row}`).font = { bold: true };
  row++;
  if (dataFrom || dataTo) {
    summarySheet.getCell(`A${row}`).value = `Periodo: ${dataFrom || 'inizio'} - ${dataTo || 'oggi'}`;
    row++;
  }
  if (repartoId) {
    const rep = reparti.find((r: any) => r.id === repartoId);
    summarySheet.getCell(`A${row}`).value = `Reparto Finale: ${rep?.nome || repartoId}`;
    row++;
  }
  if (tipoDocumento) {
    summarySheet.getCell(`A${row}`).value = `Tipo Documento: ${tipoDocumento}`;
    row++;
  }
  if (linea) {
    summarySheet.getCell(`A${row}`).value = `Linea: ${linea}`;
    row++;
  }
  if (showUncorrelatedCosts) {
    summarySheet.getCell(`A${row}`).value = '* Inclusi costi non correlati ai reparti';
    summarySheet.getCell(`A${row}`).font = { italic: true, color: { argb: 'FFFF6F00' } };
    row++;
  }
  if (showCostoTomaia) {
    summarySheet.getCell(`A${row}`).value = '* Costo Tomaia attivo (Taglio+Orlatura per esteri)';
    summarySheet.getCell(`A${row}`).font = { italic: true, color: { argb: 'FF7B1FA2' } };
    row++;
  }

  // Calculate totals con nuova logica (costiAssociati + prodottoEstero + costoTomaia)
  let totalQuantita = 0;
  let totalFatturato = 0;
  let totalCostoTomaia = 0;
  const totalCosts: Record<string, number> = {};
  COST_FIELDS.forEach(f => totalCosts[f] = 0);
  let grandTotalCosti = 0;

  records.forEach((r: any) => {
    const { costs, totalCosto, fatturato, costoTomaia } = getApplicableCosts(r, repartoMap, showUncorrelatedCosts, showCostoTomaia);
    totalQuantita += Number(r.quantita) || 0;
    totalFatturato += fatturato;
    grandTotalCosti += totalCosto;
    totalCostoTomaia += costoTomaia;
    COST_FIELDS.forEach(f => totalCosts[f] += costs[f]);
  });

  // Nota record esclusi
  if (excludedCount > 0) {
    row++;
    summarySheet.getCell(`A${row}`).value = `** ${excludedCount} record esclusi dall'analisi per informazioni incomplete (reparto finale non assegnato).`;
    summarySheet.getCell(`A${row}`).font = { italic: true, color: { argb: 'FFD32F2F' } };
    summarySheet.mergeCells(`A${row}:G${row}`);
  }

  // Summary section
  row += 2;
  summarySheet.getCell(`A${row}`).value = 'RIEPILOGO GENERALE';
  summarySheet.getCell(`A${row}`).font = { bold: true, size: 12 };
  row++;

  const summaryData: [string, number, boolean][] = [
    ['Totale Record', records.length, false],
    ['Totale Quantità', totalQuantita, false],
    ['Costo Taglio', totalCosts.costoTaglio, true],
    ['Costo Orlatura', totalCosts.costoOrlatura, true],
    ['Costo Strobel', totalCosts.costoStrobel, true],
    ['Altri Costi', totalCosts.altriCosti, true],
    ['Costo Montaggio', totalCosts.costoMontaggio, true],
  ];

  // Aggiungi Costo Tomaia se attivo e c'è valore
  if (showCostoTomaia && totalCostoTomaia > 0) {
    summaryData.push(['Costo Tomaia', totalCostoTomaia, true]);
  }

  summaryData.push(['TOTALE COSTI', grandTotalCosti, true]);
  summaryData.push(['FATTURATO', totalFatturato, true]);

  summaryData.forEach(([label, value, isCurrency]) => {
    summarySheet.getCell(`A${row}`).value = label as string;
    summarySheet.getCell(`B${row}`).value = value as number;
    if (isCurrency) {
      summarySheet.getCell(`B${row}`).numFmt = '€ #,##0.00';
    }
    if (label === 'TOTALE COSTI' || label === 'FATTURATO') {
      summarySheet.getCell(`A${row}`).font = { bold: true };
      summarySheet.getCell(`B${row}`).font = { bold: true };
    }
    if (label === 'FATTURATO') {
      summarySheet.getCell(`A${row}`).font = { bold: true, color: { argb: 'FF2E7D32' } };
      summarySheet.getCell(`B${row}`).font = { bold: true, color: { argb: 'FF2E7D32' } };
    }
    if (label === 'Costo Tomaia') {
      summarySheet.getCell(`A${row}`).font = { bold: true, color: { argb: 'FF7B1FA2' } };
      summarySheet.getCell(`B${row}`).font = { bold: true, color: { argb: 'FF7B1FA2' } };
    }
    row++;
  });

  summarySheet.getColumn('A').width = 25;
  summarySheet.getColumn('B').width = 20;

  // ==================== SHEET 2: Per Reparto Finale ====================
  const repartoSheet = workbook.addWorksheet('Per Reparto');

  // Group by reparto FINALE con nuova logica costi
  const byReparto = new Map<string, any>();
  records.forEach((r: any) => {
    const key = r.repartoFinale?.nome || 'Non assegnato';
    if (!byReparto.has(key)) {
      byReparto.set(key, {
        count: 0, quantita: 0,
        costoTaglio: 0, costoOrlatura: 0, costoStrobel: 0, altriCosti: 0, costoMontaggio: 0,
        costoTomaia: 0, totalCosto: 0, fatturato: 0
      });
    }
    const g = byReparto.get(key);
    const { costs, totalCosto, fatturato, costoTomaia } = getApplicableCosts(r, repartoMap, showUncorrelatedCosts, showCostoTomaia);
    g.count++;
    g.quantita += Number(r.quantita) || 0;
    g.costoTaglio += costs.costoTaglio;
    g.costoOrlatura += costs.costoOrlatura;
    g.costoStrobel += costs.costoStrobel;
    g.altriCosti += costs.altriCosti;
    g.costoMontaggio += costs.costoMontaggio;
    g.costoTomaia += costoTomaia;
    g.totalCosto += totalCosto;
    g.fatturato += fatturato;
  });

  // Headers con Tomaia condizionale
  const repartoHeaders = showCostoTomaia
    ? ['Reparto', 'Record', 'Quantità', 'Taglio', 'Orlatura', 'Strobel', 'Altri', 'Montaggio', 'Tomaia', 'Tot. Costi', 'Fatturato']
    : ['Reparto', 'Record', 'Quantità', 'Taglio', 'Orlatura', 'Strobel', 'Altri', 'Montaggio', 'Tot. Costi', 'Fatturato'];
  repartoHeaders.forEach((h, idx) => {
    repartoSheet.getCell(1, idx + 1).value = h;
    repartoSheet.getCell(1, idx + 1).font = { bold: true };
    repartoSheet.getCell(1, idx + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
  });

  let repartoRow = 2;
  Array.from(byReparto.keys()).sort().forEach((key) => {
    const g = byReparto.get(key);

    repartoSheet.getCell(repartoRow, 1).value = key;
    repartoSheet.getCell(repartoRow, 2).value = g.count;
    repartoSheet.getCell(repartoRow, 3).value = g.quantita;
    repartoSheet.getCell(repartoRow, 4).value = g.costoTaglio;
    repartoSheet.getCell(repartoRow, 5).value = g.costoOrlatura;
    repartoSheet.getCell(repartoRow, 6).value = g.costoStrobel;
    repartoSheet.getCell(repartoRow, 7).value = g.altriCosti;
    repartoSheet.getCell(repartoRow, 8).value = g.costoMontaggio;

    let colOff = 9;
    if (showCostoTomaia) {
      repartoSheet.getCell(repartoRow, colOff).value = g.costoTomaia;
      repartoSheet.getCell(repartoRow, colOff).numFmt = '€ #,##0.00';
      if (g.costoTomaia > 0) {
        repartoSheet.getCell(repartoRow, colOff).font = { color: { argb: 'FF7B1FA2' } };
      }
      colOff++;
    }
    repartoSheet.getCell(repartoRow, colOff).value = g.totalCosto;
    repartoSheet.getCell(repartoRow, colOff + 1).value = g.fatturato;

    // Format cost columns
    for (let col = 4; col <= 8; col++) {
      repartoSheet.getCell(repartoRow, col).numFmt = '€ #,##0.00';
    }
    repartoSheet.getCell(repartoRow, colOff).numFmt = '€ #,##0.00';
    repartoSheet.getCell(repartoRow, colOff + 1).numFmt = '€ #,##0.00';
    // Fatturato in verde
    repartoSheet.getCell(repartoRow, colOff + 1).font = { color: { argb: 'FF2E7D32' } };

    repartoRow++;
  });

  repartoSheet.columns.forEach((col, idx) => {
    col.width = idx === 0 ? 25 : 12;
  });

  // ==================== SHEET 3: Per Mese ====================
  const meseSheet = workbook.addWorksheet('Per Mese');

  // Group by month con nuova logica
  const byMese = new Map<string, any>();
  records.forEach((r: any) => {
    const key = r.dataDocumento ? new Date(r.dataDocumento).toISOString().slice(0, 7) : 'Senza data';
    if (!byMese.has(key)) {
      byMese.set(key, {
        count: 0, quantita: 0,
        costoTaglio: 0, costoOrlatura: 0, costoStrobel: 0, altriCosti: 0, costoMontaggio: 0,
        costoTomaia: 0, totalCosto: 0, fatturato: 0
      });
    }
    const g = byMese.get(key);
    const { costs, totalCosto, fatturato, costoTomaia } = getApplicableCosts(r, repartoMap, showUncorrelatedCosts, showCostoTomaia);
    g.count++;
    g.quantita += Number(r.quantita) || 0;
    g.costoTaglio += costs.costoTaglio;
    g.costoOrlatura += costs.costoOrlatura;
    g.costoStrobel += costs.costoStrobel;
    g.altriCosti += costs.altriCosti;
    g.costoMontaggio += costs.costoMontaggio;
    g.costoTomaia += costoTomaia;
    g.totalCosto += totalCosto;
    g.fatturato += fatturato;
  });

  const meseHeaders = showCostoTomaia
    ? ['Mese', 'Record', 'Quantità', 'Taglio', 'Orlatura', 'Strobel', 'Altri', 'Montaggio', 'Tomaia', 'Tot. Costi', 'Fatturato']
    : ['Mese', 'Record', 'Quantità', 'Taglio', 'Orlatura', 'Strobel', 'Altri', 'Montaggio', 'Tot. Costi', 'Fatturato'];
  meseHeaders.forEach((h, idx) => {
    meseSheet.getCell(1, idx + 1).value = h;
    meseSheet.getCell(1, idx + 1).font = { bold: true };
    meseSheet.getCell(1, idx + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
  });

  let meseRow = 2;
  Array.from(byMese.keys()).sort().reverse().forEach((key) => {
    const g = byMese.get(key);

    meseSheet.getCell(meseRow, 1).value = key;
    meseSheet.getCell(meseRow, 2).value = g.count;
    meseSheet.getCell(meseRow, 3).value = g.quantita;
    meseSheet.getCell(meseRow, 4).value = g.costoTaglio;
    meseSheet.getCell(meseRow, 5).value = g.costoOrlatura;
    meseSheet.getCell(meseRow, 6).value = g.costoStrobel;
    meseSheet.getCell(meseRow, 7).value = g.altriCosti;
    meseSheet.getCell(meseRow, 8).value = g.costoMontaggio;

    let mColOff = 9;
    if (showCostoTomaia) {
      meseSheet.getCell(meseRow, mColOff).value = g.costoTomaia;
      meseSheet.getCell(meseRow, mColOff).numFmt = '€ #,##0.00';
      if (g.costoTomaia > 0) {
        meseSheet.getCell(meseRow, mColOff).font = { color: { argb: 'FF7B1FA2' } };
      }
      mColOff++;
    }
    meseSheet.getCell(meseRow, mColOff).value = g.totalCosto;
    meseSheet.getCell(meseRow, mColOff + 1).value = g.fatturato;

    for (let col = 4; col <= 8; col++) {
      meseSheet.getCell(meseRow, col).numFmt = '€ #,##0.00';
    }
    meseSheet.getCell(meseRow, mColOff).numFmt = '€ #,##0.00';
    meseSheet.getCell(meseRow, mColOff + 1).numFmt = '€ #,##0.00';
    meseSheet.getCell(meseRow, mColOff + 1).font = { color: { argb: 'FF2E7D32' } };

    meseRow++;
  });

  meseSheet.columns.forEach((col, idx) => {
    col.width = idx === 0 ? 15 : 12;
  });

  // ==================== SHEET 4: Dettagli (optional) ====================
  if (includeDetails) {
    const detailSheet = workbook.addWorksheet('Dettagli Record');

    const detailHeaders = [
      'ID', 'Data', 'Tipo Doc', 'N. Doc', 'Linea', 'Articolo', 'Descrizione',
      'Quantità', 'Prod. Estero', 'Reparto', 'Reparto Finale',
      'Taglio', 'Orlatura', 'Strobel', 'Altri', 'Montaggio',
      ...(showCostoTomaia ? ['Tomaia'] : []),
      'Tot. Costi', 'Fatturato'
    ];

    detailHeaders.forEach((h, idx) => {
      detailSheet.getCell(1, idx + 1).value = h;
      detailSheet.getCell(1, idx + 1).font = { bold: true };
      detailSheet.getCell(1, idx + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
    });

    records.forEach((r: any, idx: number) => {
      const rowNum = idx + 2;
      const { costs, totalCosto, fatturato, costoTomaia } = getApplicableCosts(r, repartoMap, showUncorrelatedCosts, showCostoTomaia);

      detailSheet.getCell(rowNum, 1).value = r.id;
      detailSheet.getCell(rowNum, 2).value = r.dataDocumento ? new Date(r.dataDocumento).toLocaleDateString('it-IT') : '';
      detailSheet.getCell(rowNum, 3).value = r.tipoDocumento || '';
      detailSheet.getCell(rowNum, 4).value = r.numeroDocumento || '';
      detailSheet.getCell(rowNum, 5).value = r.linea || '';
      detailSheet.getCell(rowNum, 6).value = r.articolo || '';
      detailSheet.getCell(rowNum, 7).value = r.descrizioneArt || '';
      detailSheet.getCell(rowNum, 8).value = Number(r.quantita) || 0;
      detailSheet.getCell(rowNum, 9).value = r.prodottoEstero === true ? 'Sì' : r.prodottoEstero === false ? 'No' : '';
      detailSheet.getCell(rowNum, 10).value = r.reparto?.nome || '';
      detailSheet.getCell(rowNum, 11).value = r.repartoFinale?.nome || '';
      // Costi calcolati (già applicata logica costiAssociati e prodottoEstero)
      detailSheet.getCell(rowNum, 12).value = costs.costoTaglio;
      detailSheet.getCell(rowNum, 13).value = costs.costoOrlatura;
      detailSheet.getCell(rowNum, 14).value = costs.costoStrobel;
      detailSheet.getCell(rowNum, 15).value = costs.altriCosti;
      detailSheet.getCell(rowNum, 16).value = costs.costoMontaggio;

      let colOffset = 17;
      if (showCostoTomaia) {
        detailSheet.getCell(rowNum, colOffset).value = costoTomaia;
        detailSheet.getCell(rowNum, colOffset).numFmt = '€ #,##0.00';
        if (costoTomaia > 0) {
          detailSheet.getCell(rowNum, colOffset).font = { color: { argb: 'FF7B1FA2' } };
        }
        colOffset++;
      }

      detailSheet.getCell(rowNum, colOffset).value = totalCosto;
      detailSheet.getCell(rowNum, colOffset + 1).value = fatturato;

      // Format cost columns
      for (let col = 12; col <= 16; col++) {
        detailSheet.getCell(rowNum, col).numFmt = '€ #,##0.00';
      }
      detailSheet.getCell(rowNum, colOffset).numFmt = '€ #,##0.00';
      detailSheet.getCell(rowNum, colOffset + 1).numFmt = '€ #,##0.00';
      detailSheet.getCell(rowNum, colOffset + 1).font = { color: { argb: 'FF2E7D32' } };
    });

    // Auto-fit columns
    detailSheet.columns.forEach((col, idx) => {
      const baseWidths = [6, 12, 12, 12, 15, 15, 25, 8, 10, 20, 20, 10, 10, 10, 10, 10];
      const extraWidths = showCostoTomaia ? [10, 12, 12] : [12, 12];
      const widths = [...baseWidths, ...extraWidths];
      col.width = widths[idx] || 12;
    });
  }

  // Save file
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
