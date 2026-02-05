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
  } = payload as ReportFilters;

  const { trackingService, ensureOutputPath } = helpers;
  const prisma = (trackingService as any).prisma;

  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `REPORT_ANALITICHE_${dateStr}.xlsx`;
  const { fullPath } = await ensureOutputPath(userId, jobId, fileName);

  // Build query filters - IMPORTANTE: solo record con repartoFinaleId
  const where: any = {
    repartoFinaleId: { not: null }, // Solo record completi
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
  if (repartoId) where.repartoFinaleId = repartoId; // Usa repartoFinale!
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

  // Count excluded records (senza repartoFinaleId)
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

  // Calculate totals - NOTA: i costi nei record sono UNITARI, moltiplicare per quantità
  let totalQuantita = 0;
  let totalTaglio = 0;
  let totalOrlatura = 0;
  let totalStrobel = 0;
  let totalAltri = 0;
  let totalMontaggio = 0;

  records.forEach((r: any) => {
    const qty = Number(r.quantita) || 0;
    totalQuantita += qty;
    // Moltiplica costo unitario per quantità per ottenere il costo totale del record
    totalTaglio += (Number(r.costoTaglio) || 0) * qty;
    totalOrlatura += (Number(r.costoOrlatura) || 0) * qty;
    totalStrobel += (Number(r.costoStrobel) || 0) * qty;
    totalAltri += (Number(r.altriCosti) || 0) * qty;
    totalMontaggio += (Number(r.costoMontaggio) || 0) * qty;
  });

  const totalCosti = totalTaglio + totalOrlatura + totalStrobel + totalAltri + totalMontaggio;

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

  const summaryData = [
    ['Totale Record', records.length],
    ['Totale Quantità', totalQuantita],
    ['Costo Taglio', totalTaglio],
    ['Costo Orlatura', totalOrlatura],
    ['Costo Strobel', totalStrobel],
    ['Altri Costi', totalAltri],
    ['Costo Montaggio', totalMontaggio],
    ['COSTO TOTALE', totalCosti],
  ];

  summaryData.forEach(([label, value]) => {
    summarySheet.getCell(`A${row}`).value = label as string;
    summarySheet.getCell(`B${row}`).value = value as number;
    if (typeof value === 'number' && label !== 'Totale Record' && label !== 'Totale Quantità') {
      summarySheet.getCell(`B${row}`).numFmt = '€ #,##0.00';
    }
    if (label === 'COSTO TOTALE') {
      summarySheet.getCell(`A${row}`).font = { bold: true };
      summarySheet.getCell(`B${row}`).font = { bold: true };
    }
    row++;
  });

  summarySheet.getColumn('A').width = 25;
  summarySheet.getColumn('B').width = 20;

  // ==================== SHEET 2: Per Reparto Finale ====================
  const repartoSheet = workbook.addWorksheet('Per Reparto');

  // Group by reparto FINALE - i costi sono unitari, moltiplicare per quantità
  const byReparto = new Map<string, any>();
  records.forEach((r: any) => {
    const key = r.repartoFinale?.nome || 'Non assegnato';
    if (!byReparto.has(key)) {
      byReparto.set(key, { count: 0, quantita: 0, costoTaglio: 0, costoOrlatura: 0, costoStrobel: 0, altriCosti: 0, costoMontaggio: 0 });
    }
    const g = byReparto.get(key);
    const qty = Number(r.quantita) || 0;
    g.count++;
    g.quantita += qty;
    g.costoTaglio += (Number(r.costoTaglio) || 0) * qty;
    g.costoOrlatura += (Number(r.costoOrlatura) || 0) * qty;
    g.costoStrobel += (Number(r.costoStrobel) || 0) * qty;
    g.altriCosti += (Number(r.altriCosti) || 0) * qty;
    g.costoMontaggio += (Number(r.costoMontaggio) || 0) * qty;
  });

  const repartoHeaders = ['Reparto', 'Record', 'Quantità', 'Taglio', 'Orlatura', 'Strobel', 'Altri', 'Montaggio', 'Totale', 'Costo Unit.', '% Totale'];
  repartoHeaders.forEach((h, idx) => {
    repartoSheet.getCell(1, idx + 1).value = h;
    repartoSheet.getCell(1, idx + 1).font = { bold: true };
    repartoSheet.getCell(1, idx + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
  });

  let repartoRow = 2;
  Array.from(byReparto.keys()).sort().forEach((key) => {
    const g = byReparto.get(key);
    const tot = g.costoTaglio + g.costoOrlatura + g.costoStrobel + g.altriCosti + g.costoMontaggio;
    const costoPaio = g.quantita > 0 ? tot / g.quantita : 0;
    const perc = totalCosti > 0 ? (tot / totalCosti) * 100 : 0;

    repartoSheet.getCell(repartoRow, 1).value = key;
    repartoSheet.getCell(repartoRow, 2).value = g.count;
    repartoSheet.getCell(repartoRow, 3).value = g.quantita;
    repartoSheet.getCell(repartoRow, 4).value = g.costoTaglio;
    repartoSheet.getCell(repartoRow, 5).value = g.costoOrlatura;
    repartoSheet.getCell(repartoRow, 6).value = g.costoStrobel;
    repartoSheet.getCell(repartoRow, 7).value = g.altriCosti;
    repartoSheet.getCell(repartoRow, 8).value = g.costoMontaggio;
    repartoSheet.getCell(repartoRow, 9).value = tot;
    repartoSheet.getCell(repartoRow, 10).value = costoPaio;
    repartoSheet.getCell(repartoRow, 11).value = perc / 100;

    // Format
    for (let col = 4; col <= 10; col++) {
      repartoSheet.getCell(repartoRow, col).numFmt = '€ #,##0.00';
    }
    repartoSheet.getCell(repartoRow, 11).numFmt = '0.0%';

    repartoRow++;
  });

  // Auto-fit columns
  repartoSheet.columns.forEach((col, idx) => {
    col.width = idx === 0 ? 25 : 12;
  });

  // ==================== SHEET 3: Per Mese ====================
  const meseSheet = workbook.addWorksheet('Per Mese');

  // Group by month - i costi sono unitari, moltiplicare per quantità
  const byMese = new Map<string, any>();
  records.forEach((r: any) => {
    const key = r.dataDocumento ? new Date(r.dataDocumento).toISOString().slice(0, 7) : 'Senza data';
    if (!byMese.has(key)) {
      byMese.set(key, { count: 0, quantita: 0, costoTaglio: 0, costoOrlatura: 0, costoStrobel: 0, altriCosti: 0, costoMontaggio: 0 });
    }
    const g = byMese.get(key);
    const qty = Number(r.quantita) || 0;
    g.count++;
    g.quantita += qty;
    g.costoTaglio += (Number(r.costoTaglio) || 0) * qty;
    g.costoOrlatura += (Number(r.costoOrlatura) || 0) * qty;
    g.costoStrobel += (Number(r.costoStrobel) || 0) * qty;
    g.altriCosti += (Number(r.altriCosti) || 0) * qty;
    g.costoMontaggio += (Number(r.costoMontaggio) || 0) * qty;
  });

  const meseHeaders = ['Mese', 'Record', 'Quantità', 'Taglio', 'Orlatura', 'Strobel', 'Altri', 'Montaggio', 'Totale', 'Costo Unit.'];
  meseHeaders.forEach((h, idx) => {
    meseSheet.getCell(1, idx + 1).value = h;
    meseSheet.getCell(1, idx + 1).font = { bold: true };
    meseSheet.getCell(1, idx + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
  });

  let meseRow = 2;
  Array.from(byMese.keys()).sort().reverse().forEach((key) => {
    const g = byMese.get(key);
    const tot = g.costoTaglio + g.costoOrlatura + g.costoStrobel + g.altriCosti + g.costoMontaggio;
    const costoPaio = g.quantita > 0 ? tot / g.quantita : 0;

    meseSheet.getCell(meseRow, 1).value = key;
    meseSheet.getCell(meseRow, 2).value = g.count;
    meseSheet.getCell(meseRow, 3).value = g.quantita;
    meseSheet.getCell(meseRow, 4).value = g.costoTaglio;
    meseSheet.getCell(meseRow, 5).value = g.costoOrlatura;
    meseSheet.getCell(meseRow, 6).value = g.costoStrobel;
    meseSheet.getCell(meseRow, 7).value = g.altriCosti;
    meseSheet.getCell(meseRow, 8).value = g.costoMontaggio;
    meseSheet.getCell(meseRow, 9).value = tot;
    meseSheet.getCell(meseRow, 10).value = costoPaio;

    for (let col = 4; col <= 10; col++) {
      meseSheet.getCell(meseRow, col).numFmt = '€ #,##0.00';
    }

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
      'Taglio', 'Orlatura', 'Strobel', 'Altri', 'Montaggio', 'Totale'
    ];

    detailHeaders.forEach((h, idx) => {
      detailSheet.getCell(1, idx + 1).value = h;
      detailSheet.getCell(1, idx + 1).font = { bold: true };
      detailSheet.getCell(1, idx + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
    });

    records.forEach((r: any, idx: number) => {
      const rowNum = idx + 2;
      const qty = Number(r.quantita) || 0;
      // I costi nel DB sono unitari - calcola totale riga moltiplicando per quantità
      const costoUnitTotale = (Number(r.costoTaglio) || 0) + (Number(r.costoOrlatura) || 0) +
                  (Number(r.costoStrobel) || 0) + (Number(r.altriCosti) || 0) +
                  (Number(r.costoMontaggio) || 0);
      const costoTotaleRiga = costoUnitTotale * qty;

      detailSheet.getCell(rowNum, 1).value = r.id;
      detailSheet.getCell(rowNum, 2).value = r.dataDocumento ? new Date(r.dataDocumento).toLocaleDateString('it-IT') : '';
      detailSheet.getCell(rowNum, 3).value = r.tipoDocumento || '';
      detailSheet.getCell(rowNum, 4).value = r.numeroDocumento || '';
      detailSheet.getCell(rowNum, 5).value = r.linea || '';
      detailSheet.getCell(rowNum, 6).value = r.articolo || '';
      detailSheet.getCell(rowNum, 7).value = r.descrizioneArt || '';
      detailSheet.getCell(rowNum, 8).value = qty;
      detailSheet.getCell(rowNum, 9).value = r.prodottoEstero === true ? 'Sì' : r.prodottoEstero === false ? 'No' : '';
      detailSheet.getCell(rowNum, 10).value = r.reparto?.nome || '';
      detailSheet.getCell(rowNum, 11).value = r.repartoFinale?.nome || '';
      // Costi unitari
      detailSheet.getCell(rowNum, 12).value = Number(r.costoTaglio) || 0;
      detailSheet.getCell(rowNum, 13).value = Number(r.costoOrlatura) || 0;
      detailSheet.getCell(rowNum, 14).value = Number(r.costoStrobel) || 0;
      detailSheet.getCell(rowNum, 15).value = Number(r.altriCosti) || 0;
      detailSheet.getCell(rowNum, 16).value = Number(r.costoMontaggio) || 0;
      // Totale = somma costi unitari * quantità
      detailSheet.getCell(rowNum, 17).value = costoTotaleRiga;

      // Format cost columns
      for (let col = 12; col <= 17; col++) {
        detailSheet.getCell(rowNum, col).numFmt = '€ #,##0.00';
      }
    });

    // Auto-fit columns
    detailSheet.columns.forEach((col, idx) => {
      const widths = [6, 12, 12, 12, 15, 15, 25, 8, 10, 20, 20, 10, 10, 10, 10, 10, 12];
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
