import PDFDocument = require('pdfkit');
import { JobHandler } from '../types';
import * as fs from 'fs';

interface ReportFilters {
  userId: number;
  jobId: string;
  dataFrom?: string;
  dataTo?: string;
  repartoId?: number;
  tipoDocumento?: string;
  linea?: string;
  groupBy?: 'reparto' | 'linea' | 'tipoDocumento' | 'mese';
  includeArticoliPerReparto?: boolean;
  showUncorrelatedCosts?: boolean;
  showCostoTomaia?: boolean;
}

// Mappa dei nomi dei campi costo
const COST_FIELDS = ['costoTaglio', 'costoOrlatura', 'costoStrobel', 'altriCosti', 'costoMontaggio'];
const COST_LABELS: Record<string, string> = {
  costoTaglio: 'Taglio',
  costoOrlatura: 'Orlatura',
  costoStrobel: 'Strobel',
  altriCosti: 'Altri',
  costoMontaggio: 'Montaggio',
};

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
    groupBy = 'reparto',
    includeArticoliPerReparto = false,
    showUncorrelatedCosts = false,
    showCostoTomaia = false,
  } = payload as ReportFilters;

  const { ensureOutputPath, trackingService } = helpers;
  const prisma = (trackingService as any).prisma;

  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `REPORT_ANALITICHE_${groupBy.toUpperCase()}_${dateStr}.pdf`;
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

  // Get all reparti for mapping
  const reparti = await prisma.analiticaReparto.findMany({
    orderBy: { ordine: 'asc' },
  });
  const repartoMap: Map<number, any> = new Map(
    reparti.map((r: any) => [r.id as number, r]),
  );

  // Generate PDF
  const buffer = await generateReportPdf(records, repartoMap, {
    dataFrom,
    dataTo,
    repartoId,
    tipoDocumento,
    linea,
    groupBy,
    includeArticoliPerReparto,
    showUncorrelatedCosts,
    showCostoTomaia,
    excludedCount,
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

async function generateReportPdf(
  records: any[],
  repartoMap: Map<number, any>,
  filters: any,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 40,
        size: 'A4',
        layout: 'landscape',
        autoFirstPage: true,
        info: {
          Title: 'Report Analisi Costi',
          Author: 'CoreGRE Sistema Analitico',
          Subject: 'Analisi Costi Produzione',
        }
      });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 80;
      const pageHeight = doc.page.height;
      const bottomMargin = 40;
      const usableBottom = pageHeight - bottomMargin;
      const primaryColor = '#1565C0';
      const secondaryColor = '#424242';
      const accentColor = '#E3F2FD';

      // Helper: scrivi testo con posizione fissa SENZA auto-paging
      const safeText = (text: string, x: number, y: number, opts?: any) => {
        doc.text(text, x, y, { lineBreak: false, ...opts });
      };

      // Helper: controlla se serve nuova pagina e la crea
      const needsNewPage = (y: number, neededHeight: number): boolean => {
        return (y + neededHeight) > usableBottom;
      };

      // Helper: disegna header tabella analisi
      const drawAnalysisHeader = (headers: string[], colWidths: number[], totalW: number, startY: number) => {
        doc.rect(40, startY, totalW, 22).fill(primaryColor);
        doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
        let hx = 45;
        headers.forEach((h, i) => {
          safeText(h, hx, startY + 7, { width: colWidths[i] - 5 });
          hx += colWidths[i];
        });
      };

      // ==================== PAGINA 1: COPERTINA E RIEPILOGO ====================

      // Header
      doc.rect(0, 0, doc.page.width, 80).fill(primaryColor);
      doc.fillColor('#FFFFFF')
         .fontSize(28)
         .font('Helvetica-Bold');
      safeText('REPORT ANALISI COSTI', 40, 25);
      doc.fontSize(12)
         .font('Helvetica');
      safeText('Sistema Analitico CoreGRE', 40, 55);

      doc.fillColor(secondaryColor)
         .fontSize(10);
      safeText(`Generato: ${new Date().toLocaleString('it-IT')}`, 40, 100);

      // Box filtri
      const filterBoxY = 130;
      doc.rect(40, filterBoxY, 300, 100).stroke(primaryColor);
      doc.fillColor(primaryColor)
         .fontSize(11)
         .font('Helvetica-Bold');
      safeText('FILTRI APPLICATI', 50, filterBoxY + 10);

      doc.fillColor(secondaryColor).fontSize(9).font('Helvetica');
      let filterY = filterBoxY + 30;

      if (filters.dataFrom || filters.dataTo) {
        safeText(`Periodo: ${filters.dataFrom || 'inizio'} → ${filters.dataTo || 'oggi'}`, 50, filterY);
        filterY += 15;
      }
      if (filters.repartoId) {
        const rep = repartoMap.get(filters.repartoId);
        safeText(`Reparto Finale: ${rep?.nome || filters.repartoId}`, 50, filterY);
        filterY += 15;
      }
      if (filters.tipoDocumento) {
        safeText(`Tipo Documento: ${filters.tipoDocumento}`, 50, filterY);
        filterY += 15;
      }
      if (filters.linea) {
        safeText(`Linea: ${filters.linea}`, 50, filterY);
        filterY += 15;
      }
      safeText(`Raggruppamento: ${filters.groupBy.toUpperCase()}`, 50, filterY);
      if (filters.showUncorrelatedCosts) {
        filterY += 15;
        doc.fillColor('#FF6F00');
        safeText('* Inclusi costi non correlati ai reparti', 50, filterY);
        doc.fillColor(secondaryColor);
      }
      if (filters.showCostoTomaia) {
        filterY += 15;
        doc.fillColor('#7B1FA2');
        safeText('* Costo Tomaia attivo (Taglio+Orlatura per esteri)', 50, filterY);
        doc.fillColor(secondaryColor);
      }

      // Calculate totals con nuova logica
      let totalQuantita = 0;
      let totalFatturato = 0;
      let totalCostoTomaia = 0;
      const totalCosts: Record<string, number> = {};
      COST_FIELDS.forEach(f => totalCosts[f] = 0);
      let grandTotalCosti = 0;

      records.forEach((r: any) => {
        const { costs, totalCosto, fatturato, costoTomaia } = getApplicableCosts(r, repartoMap, filters.showUncorrelatedCosts, filters.showCostoTomaia);
        totalQuantita += Number(r.quantita) || 0;
        totalFatturato += fatturato;
        grandTotalCosti += totalCosto;
        totalCostoTomaia += costoTomaia;
        COST_FIELDS.forEach(f => totalCosts[f] += costs[f]);
      });

      // Box KPI
      const kpiBoxY = filterBoxY;
      const kpiBoxX = 360;
      const kpiBoxW = 420;

      doc.rect(kpiBoxX, kpiBoxY, kpiBoxW, 100).fill(accentColor).stroke(primaryColor);
      doc.fillColor(primaryColor)
         .fontSize(11)
         .font('Helvetica-Bold');
      safeText('INDICATORI CHIAVE', kpiBoxX + 10, kpiBoxY + 10);

      const kpiData = [
        { label: 'Record Analizzati', value: records.length.toLocaleString('it-IT'), x: kpiBoxX + 15, y: kpiBoxY + 35 },
        { label: 'Quantità Totale', value: totalQuantita.toLocaleString('it-IT', { maximumFractionDigits: 0 }), x: kpiBoxX + 115, y: kpiBoxY + 35 },
        { label: 'Totale Costi', value: `€ ${grandTotalCosti.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, x: kpiBoxX + 215, y: kpiBoxY + 35 },
        { label: 'Fatturato', value: `€ ${totalFatturato.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, x: kpiBoxX + 315, y: kpiBoxY + 35 },
      ];

      kpiData.forEach(kpi => {
        doc.fillColor('#666').fontSize(8).font('Helvetica');
        safeText(kpi.label, kpi.x, kpi.y);
        doc.fillColor(secondaryColor).fontSize(14).font('Helvetica-Bold');
        safeText(kpi.value, kpi.x, kpi.y + 12);
      });

      // Nota record esclusi
      if (filters.excludedCount > 0) {
        doc.fillColor('#D32F2F')
           .fontSize(9)
           .font('Helvetica-Oblique');
        safeText(
          `** ${filters.excludedCount} record esclusi dall'analisi per informazioni incomplete (reparto finale non assegnato).`,
          40, kpiBoxY + 115, { width: pageWidth }
        );
      }

      // ==================== TABELLA DETTAGLIO COSTI ====================
      const costTableY = 260;
      doc.fillColor(primaryColor)
         .fontSize(12)
         .font('Helvetica-Bold');
      safeText('DETTAGLIO COMPOSIZIONE COSTI', 40, costTableY);

      const costHeaders = ['Voce di Costo', 'Importo (€)', 'Incidenza'];
      const costColWidths = [200, 150, 350];
      const costTotalW = costColWidths.reduce((a, b) => a + b, 0);

      // Header tabella
      let tableY = costTableY + 20;
      doc.rect(40, tableY, costTotalW, 22).fill(primaryColor);
      doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
      let tableX = 45;
      costHeaders.forEach((h, i) => {
        safeText(h, tableX, tableY + 7, { width: costColWidths[i] - 10 });
        tableX += costColWidths[i];
      });

      // Righe dati
      tableY += 22;
      doc.font('Helvetica').fontSize(9);

      let rowCounter = 0;
      COST_FIELDS.forEach((field) => {
        const value = totalCosts[field];
        const perc = grandTotalCosti > 0 ? (value / grandTotalCosti) * 100 : 0;

        if (rowCounter % 2 === 0) {
          doc.rect(40, tableY, costTotalW, 20).fill('#F5F5F5');
        }
        doc.fillColor(secondaryColor);

        tableX = 45;
        safeText(COST_LABELS[field], tableX, tableY + 6);
        tableX += costColWidths[0];
        safeText(`€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`, tableX, tableY + 6);
        tableX += costColWidths[1];

        // Barra grafica incidenza
        const barWidth = (perc / 100) * 320;
        doc.rect(tableX, tableY + 5, barWidth, 10).fill(primaryColor);
        doc.fillColor(secondaryColor);
        safeText(`${perc.toFixed(1)}%`, tableX + barWidth + 5, tableY + 6);

        tableY += 20;
        rowCounter++;
      });

      // Riga Costo Tomaia (solo se showCostoTomaia attivo e c'è valore)
      if (filters.showCostoTomaia && totalCostoTomaia > 0) {
        const percTomaia = grandTotalCosti > 0 ? (totalCostoTomaia / grandTotalCosti) * 100 : 0;

        if (rowCounter % 2 === 0) {
          doc.rect(40, tableY, costTotalW, 20).fill('#F3E5F5');
        } else {
          doc.rect(40, tableY, costTotalW, 20).fill('#EDE7F6');
        }
        doc.fillColor('#7B1FA2').font('Helvetica-Bold');

        tableX = 45;
        safeText('Costo Tomaia', tableX, tableY + 6);
        tableX += costColWidths[0];
        safeText(`€ ${totalCostoTomaia.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`, tableX, tableY + 6);
        tableX += costColWidths[1];

        // Barra grafica incidenza viola
        const barWidth = (percTomaia / 100) * 320;
        doc.rect(tableX, tableY + 5, barWidth, 10).fill('#7B1FA2');
        doc.fillColor('#7B1FA2');
        safeText(`${percTomaia.toFixed(1)}%`, tableX + barWidth + 5, tableY + 6);

        tableY += 20;
        doc.font('Helvetica').fillColor(secondaryColor);
      }

      // Riga totale costi
      doc.rect(40, tableY, costTotalW, 22).fill(primaryColor);
      doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
      safeText('TOTALE COSTI', 45, tableY + 6);
      safeText(`€ ${grandTotalCosti.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`, 45 + costColWidths[0], tableY + 6);

      // Riga fatturato
      tableY += 22;
      doc.rect(40, tableY, costTotalW, 22).fill('#E8F5E9');
      doc.fillColor('#2E7D32').fontSize(10).font('Helvetica-Bold');
      safeText('FATTURATO', 45, tableY + 6);
      safeText(`€ ${totalFatturato.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`, 45 + costColWidths[0], tableY + 6);

      // ==================== PAGINA 2: ANALISI PER GRUPPO ====================
      doc.addPage();

      doc.rect(0, 0, doc.page.width, 50).fill(primaryColor);
      doc.fillColor('#FFFFFF')
         .fontSize(18)
         .font('Helvetica-Bold');
      safeText(`ANALISI PER ${filters.groupBy.toUpperCase()}`, 40, 15);

      // Raggruppa i dati
      const grouped = groupRecordsByKey(records, filters.groupBy, repartoMap, filters.showUncorrelatedCosts, filters.showCostoTomaia);

      // Headers - con Tomaia condizionale
      const analysisHeaders = filters.showCostoTomaia
        ? [filters.groupBy.charAt(0).toUpperCase() + filters.groupBy.slice(1), 'N° Doc', 'Quantità', 'Taglio', 'Orlatura', 'Strobel', 'Altri', 'Montaggio', 'Tomaia', 'Tot. Costi', 'Fatturato']
        : [filters.groupBy.charAt(0).toUpperCase() + filters.groupBy.slice(1), 'N° Doc', 'Quantità', 'Taglio', 'Orlatura', 'Strobel', 'Altri', 'Montaggio', 'Tot. Costi', 'Fatturato'];
      const analysisColWidths = filters.showCostoTomaia
        ? [100, 40, 58, 58, 58, 58, 58, 62, 62, 78, 78]
        : [110, 45, 65, 65, 65, 65, 65, 70, 85, 85];

      let analysisY = 70;
      const totalTableWidth = analysisColWidths.reduce((a, b) => a + b, 0);

      drawAnalysisHeader(analysisHeaders, analysisColWidths, totalTableWidth, analysisY);
      analysisY += 22;
      doc.font('Helvetica').fontSize(8);

      const sortedKeys = Array.from(grouped.keys()).sort();
      let rowIdx = 0;

      sortedKeys.forEach((key) => {
        // Controlla PRIMA se serve nuova pagina (riga = 18px)
        if (needsNewPage(analysisY, 18)) {
          doc.addPage();
          analysisY = 50;
          drawAnalysisHeader(analysisHeaders, analysisColWidths, totalTableWidth, analysisY);
          analysisY += 22;
          doc.font('Helvetica').fontSize(8);
        }

        const g = grouped.get(key);

        if (rowIdx % 2 === 0) {
          doc.rect(40, analysisY, totalTableWidth, 18).fill('#F8F9FA');
        }
        doc.fillColor(secondaryColor);

        let ax = 45;
        safeText(key.substring(0, 16), ax, analysisY + 5, { width: analysisColWidths[0] - 5 });
        ax += analysisColWidths[0];
        safeText(g.count.toString(), ax, analysisY + 5);
        ax += analysisColWidths[1];
        safeText(g.quantita.toLocaleString('it-IT', { maximumFractionDigits: 0 }), ax, analysisY + 5);
        ax += analysisColWidths[2];
        safeText(formatCurrency(g.costoTaglio), ax, analysisY + 5);
        ax += analysisColWidths[3];
        safeText(formatCurrency(g.costoOrlatura), ax, analysisY + 5);
        ax += analysisColWidths[4];
        safeText(formatCurrency(g.costoStrobel), ax, analysisY + 5);
        ax += analysisColWidths[5];
        safeText(formatCurrency(g.altriCosti), ax, analysisY + 5);
        ax += analysisColWidths[6];
        safeText(formatCurrency(g.costoMontaggio), ax, analysisY + 5);
        ax += analysisColWidths[7];

        if (filters.showCostoTomaia) {
          doc.fillColor('#7B1FA2');
          safeText(formatCurrency(g.costoTomaia), ax, analysisY + 5);
          doc.fillColor(secondaryColor);
          ax += analysisColWidths[8];
          doc.font('Helvetica-Bold');
          safeText(formatCurrency(g.totalCosto), ax, analysisY + 5);
          ax += analysisColWidths[9];
          doc.fillColor('#2E7D32');
          safeText(formatCurrency(g.fatturato), ax, analysisY + 5);
        } else {
          doc.font('Helvetica-Bold');
          safeText(formatCurrency(g.totalCosto), ax, analysisY + 5);
          ax += analysisColWidths[8];
          doc.fillColor('#2E7D32');
          safeText(formatCurrency(g.fatturato), ax, analysisY + 5);
        }

        analysisY += 18;
        rowIdx++;
        doc.font('Helvetica').fillColor(secondaryColor);
      });

      // ==================== PAGINA 3: ARTICOLI PER REPARTO (opzionale) ====================
      if (filters.includeArticoliPerReparto) {
        doc.addPage();

        doc.rect(0, 0, doc.page.width, 50).fill(primaryColor);
        doc.fillColor('#FFFFFF')
           .fontSize(18)
           .font('Helvetica-Bold');
        safeText('DETTAGLIO ARTICOLI PER REPARTO E LINEA', 40, 15);

        const byRepartoLinea = new Map<string, Map<string, Map<string, any>>>();

        records.forEach((r: any) => {
          const repartoNome = r.repartoFinale?.nome || 'Non assegnato';
          const lineaNome = r.linea || 'Non specificata';
          const articoloNome = r.articolo || 'N/D';
          const descrizioneArt = r.descrizioneArt || '';

          if (!byRepartoLinea.has(repartoNome)) {
            byRepartoLinea.set(repartoNome, new Map());
          }
          const lineaMap = byRepartoLinea.get(repartoNome)!;

          if (!lineaMap.has(lineaNome)) {
            lineaMap.set(lineaNome, new Map());
          }
          const articoloMap = lineaMap.get(lineaNome)!;

          const artKey = articoloNome;
          if (!articoloMap.has(artKey)) {
            articoloMap.set(artKey, { quantita: 0, costo: 0, fatturato: 0, descrizione: descrizioneArt });
          }
          const art = articoloMap.get(artKey)!;
          const { totalCosto, fatturato } = getApplicableCosts(r, repartoMap, filters.showUncorrelatedCosts, filters.showCostoTomaia);
          art.quantita += Number(r.quantita) || 0;
          art.costo += totalCosto;
          art.fatturato += fatturato;
          if (!art.descrizione && descrizioneArt) {
            art.descrizione = descrizioneArt;
          }
        });

        let detailY = 70;
        const repartiSorted = Array.from(byRepartoLinea.keys()).sort();

        repartiSorted.forEach((repartoNome) => {
          // Serve spazio per header reparto (20) + header linea (16) + header colonne (12) + almeno 1 riga (10) = 58
          if (needsNewPage(detailY, 58)) {
            doc.addPage();
            detailY = 50;
          }

          doc.rect(40, detailY, pageWidth, 20).fill(primaryColor);
          doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
          safeText(`REPARTO: ${repartoNome}`, 45, detailY + 5);
          detailY += 25;

          const lineaMap = byRepartoLinea.get(repartoNome)!;
          const lineeSorted = Array.from(lineaMap.keys()).sort();

          lineeSorted.forEach((lineaNome) => {
            // Serve spazio per header linea (16) + header colonne (12) + almeno 1 riga (10) = 38
            if (needsNewPage(detailY, 38)) {
              doc.addPage();
              detailY = 50;
            }

            doc.rect(50, detailY, pageWidth - 20, 16).fill(accentColor);
            doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold');
            safeText(`Linea: ${lineaNome}`, 55, detailY + 4);
            detailY += 20;

            // Header articoli
            doc.fillColor('#666').fontSize(7).font('Helvetica-Bold');
            safeText('Articolo', 60, detailY);
            safeText('Descrizione', 180, detailY);
            safeText('Quantità', 380, detailY);
            safeText('Costo Tot.', 450, detailY);
            safeText('Fatturato', 530, detailY);
            detailY += 12;

            const articoloMap = lineaMap.get(lineaNome)!;
            const articoliSorted = Array.from(articoloMap.keys()).sort();

            doc.font('Helvetica').fontSize(7).fillColor(secondaryColor);
            articoliSorted.slice(0, 15).forEach((artNome) => {
              // Controlla se serve nuova pagina PRIMA di scrivere la riga
              if (needsNewPage(detailY, 10)) {
                doc.addPage();
                detailY = 50;
                // Re-draw colonne header sulla nuova pagina
                doc.fillColor('#666').fontSize(7).font('Helvetica-Bold');
                safeText('Articolo', 60, detailY);
                safeText('Descrizione', 180, detailY);
                safeText('Quantità', 380, detailY);
                safeText('Costo Tot.', 450, detailY);
                safeText('Fatturato', 530, detailY);
                detailY += 12;
                doc.font('Helvetica').fontSize(7).fillColor(secondaryColor);
              }

              const art = articoloMap.get(artNome)!;
              safeText(artNome.substring(0, 20), 60, detailY);
              safeText((art.descrizione || '').substring(0, 30), 180, detailY);
              safeText(art.quantita.toLocaleString('it-IT', { maximumFractionDigits: 0 }), 380, detailY);
              safeText(`€ ${art.costo.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`, 450, detailY);
              doc.fillColor('#2E7D32');
              safeText(`€ ${art.fatturato.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`, 530, detailY);
              doc.fillColor(secondaryColor);
              detailY += 10;
            });

            if (articoliSorted.length > 15) {
              doc.fillColor('#999').fontSize(7).font('Helvetica-Oblique');
              safeText(`... e altri ${articoliSorted.length - 15} articoli`, 60, detailY);
              detailY += 10;
            }

            detailY += 8;
          });

          detailY += 10;
        });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function formatCurrency(value: number): string {
  if (value === 0) return '-';
  return `€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function groupRecordsByKey(
  records: any[],
  groupBy: string,
  repartoMap: Map<number, any>,
  showUncorrelatedCosts: boolean = false,
  showCostoTomaia: boolean = false,
): Map<string, any> {
  const grouped = new Map<string, any>();

  records.forEach((r: any) => {
    let key: string;

    switch (groupBy) {
      case 'reparto':
        key = r.repartoFinale?.nome || 'Non assegnato';
        break;
      case 'linea':
        key = r.linea || 'Non specificata';
        break;
      case 'tipoDocumento':
        key = r.tipoDocumento || 'Non specificato';
        break;
      case 'mese':
        key = r.dataDocumento
          ? new Date(r.dataDocumento).toISOString().slice(0, 7)
          : 'Senza data';
        break;
      default:
        key = 'Altro';
    }

    if (!grouped.has(key)) {
      grouped.set(key, {
        count: 0,
        quantita: 0,
        costoTaglio: 0,
        costoOrlatura: 0,
        costoStrobel: 0,
        altriCosti: 0,
        costoMontaggio: 0,
        costoTomaia: 0,
        totalCosto: 0,
        fatturato: 0,
      });
    }

    const g = grouped.get(key);
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

  return grouped;
}

export default handler;
