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
  } = payload as ReportFilters;

  const { ensureOutputPath, trackingService } = helpers;
  const prisma = (trackingService as any).prisma;

  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `REPORT_ANALITICHE_${groupBy.toUpperCase()}_${dateStr}.pdf`;
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
      // PDF ORIZZONTALE per maggiore spazio
      const doc = new PDFDocument({
        margin: 40,
        size: 'A4',
        layout: 'landscape',
        bufferPages: true,
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

      const pageWidth = doc.page.width - 80; // margin 40 each side
      const primaryColor = '#1565C0';
      const secondaryColor = '#424242';
      const accentColor = '#E3F2FD';

      // ==================== PAGINA 1: COPERTINA E RIEPILOGO ====================

      // Header con logo area
      doc.rect(0, 0, doc.page.width, 80).fill(primaryColor);
      doc.fillColor('#FFFFFF')
         .fontSize(28)
         .font('Helvetica-Bold')
         .text('REPORT ANALISI COSTI', 40, 25, { width: pageWidth });
      doc.fontSize(12)
         .font('Helvetica')
         .text('Sistema Analitico CoreGRE', 40, 55);

      // Data generazione
      doc.fillColor(secondaryColor)
         .fontSize(10)
         .text(`Generato: ${new Date().toLocaleString('it-IT')}`, 40, 100);

      // Box filtri applicati
      const filterBoxY = 130;
      doc.rect(40, filterBoxY, 300, 100).stroke(primaryColor);
      doc.fillColor(primaryColor)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('FILTRI APPLICATI', 50, filterBoxY + 10);

      doc.fillColor(secondaryColor).fontSize(9).font('Helvetica');
      let filterY = filterBoxY + 30;

      if (filters.dataFrom || filters.dataTo) {
        doc.text(`Periodo: ${filters.dataFrom || 'inizio'} → ${filters.dataTo || 'oggi'}`, 50, filterY);
        filterY += 15;
      }
      if (filters.repartoId) {
        const rep = repartoMap.get(filters.repartoId);
        doc.text(`Reparto Finale: ${rep?.nome || filters.repartoId}`, 50, filterY);
        filterY += 15;
      }
      if (filters.tipoDocumento) {
        doc.text(`Tipo Documento: ${filters.tipoDocumento}`, 50, filterY);
        filterY += 15;
      }
      if (filters.linea) {
        doc.text(`Linea: ${filters.linea}`, 50, filterY);
        filterY += 15;
      }
      doc.text(`Raggruppamento: ${filters.groupBy.toUpperCase()}`, 50, filterY);

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

      // Box KPI principali
      const kpiBoxY = filterBoxY;
      const kpiBoxX = 360;
      const kpiBoxW = 420;

      doc.rect(kpiBoxX, kpiBoxY, kpiBoxW, 100).fill(accentColor).stroke(primaryColor);
      doc.fillColor(primaryColor)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('INDICATORI CHIAVE', kpiBoxX + 10, kpiBoxY + 10);

      // KPI Grid
      const kpiData = [
        { label: 'Record Analizzati', value: records.length.toLocaleString('it-IT'), x: kpiBoxX + 20, y: kpiBoxY + 35 },
        { label: 'Quantità Totale', value: totalQuantita.toLocaleString('it-IT', { maximumFractionDigits: 0 }), x: kpiBoxX + 150, y: kpiBoxY + 35 },
        { label: 'Costo Totale', value: `€ ${totalCosti.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, x: kpiBoxX + 280, y: kpiBoxY + 35 },
      ];

      kpiData.forEach(kpi => {
        doc.fillColor('#666').fontSize(8).font('Helvetica').text(kpi.label, kpi.x, kpi.y);
        doc.fillColor(secondaryColor).fontSize(16).font('Helvetica-Bold').text(kpi.value, kpi.x, kpi.y + 12);
      });

      // Nota record esclusi
      if (filters.excludedCount > 0) {
        doc.fillColor('#D32F2F')
           .fontSize(9)
           .font('Helvetica-Oblique')
           .text(`** ${filters.excludedCount} record esclusi dall'analisi per informazioni incomplete (reparto finale non assegnato).`,
                 40, kpiBoxY + 115, { width: pageWidth });
      }

      // ==================== TABELLA DETTAGLIO COSTI ====================
      const costTableY = 260;
      doc.fillColor(primaryColor)
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('DETTAGLIO COMPOSIZIONE COSTI', 40, costTableY);

      const costHeaders = ['Voce di Costo', 'Importo (€)', '% sul Totale', 'Incidenza'];
      const costColWidths = [200, 150, 100, 300];
      const costData = [
        { voce: 'Taglio', importo: totalTaglio, perc: totalCosti > 0 ? (totalTaglio / totalCosti) * 100 : 0 },
        { voce: 'Orlatura', importo: totalOrlatura, perc: totalCosti > 0 ? (totalOrlatura / totalCosti) * 100 : 0 },
        { voce: 'Strobel', importo: totalStrobel, perc: totalCosti > 0 ? (totalStrobel / totalCosti) * 100 : 0 },
        { voce: 'Altri Costi', importo: totalAltri, perc: totalCosti > 0 ? (totalAltri / totalCosti) * 100 : 0 },
        { voce: 'Montaggio', importo: totalMontaggio, perc: totalCosti > 0 ? (totalMontaggio / totalCosti) * 100 : 0 },
      ];

      // Header tabella
      let tableY = costTableY + 20;
      doc.rect(40, tableY, costColWidths.reduce((a, b) => a + b, 0), 22).fill(primaryColor);
      doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
      let tableX = 45;
      costHeaders.forEach((h, i) => {
        doc.text(h, tableX, tableY + 7, { width: costColWidths[i] - 10 });
        tableX += costColWidths[i];
      });

      // Righe dati
      tableY += 22;
      doc.font('Helvetica').fontSize(9);
      costData.forEach((row, idx) => {
        if (idx % 2 === 0) {
          doc.rect(40, tableY, costColWidths.reduce((a, b) => a + b, 0), 20).fill('#F5F5F5');
        }
        doc.fillColor(secondaryColor);

        tableX = 45;
        doc.text(row.voce, tableX, tableY + 6);
        tableX += costColWidths[0];
        doc.text(`€ ${row.importo.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`, tableX, tableY + 6);
        tableX += costColWidths[1];
        doc.text(`${row.perc.toFixed(1)}%`, tableX, tableY + 6);
        tableX += costColWidths[2];

        // Barra grafica incidenza
        const barWidth = (row.perc / 100) * 280;
        doc.rect(tableX, tableY + 5, barWidth, 10).fill(primaryColor);

        tableY += 20;
      });

      // Riga totale
      doc.rect(40, tableY, costColWidths.reduce((a, b) => a + b, 0), 22).fill(primaryColor);
      doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
      doc.text('TOTALE', 45, tableY + 6);
      doc.text(`€ ${totalCosti.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`, 45 + costColWidths[0], tableY + 6);
      doc.text('100%', 45 + costColWidths[0] + costColWidths[1], tableY + 6);

      // ==================== PAGINA 2: ANALISI PER GRUPPO ====================
      doc.addPage();

      // Header pagina
      doc.rect(0, 0, doc.page.width, 50).fill(primaryColor);
      doc.fillColor('#FFFFFF')
         .fontSize(18)
         .font('Helvetica-Bold')
         .text(`ANALISI PER ${filters.groupBy.toUpperCase()}`, 40, 15);

      // Raggruppa i dati - USA REPARTO FINALE!
      const grouped = groupRecordsByRepartoFinale(records, filters.groupBy, repartoMap);

      // Headers tabella analisi
      const analysisHeaders = [filters.groupBy.charAt(0).toUpperCase() + filters.groupBy.slice(1), 'N° Doc', 'Quantità', 'Taglio', 'Orlatura', 'Strobel', 'Altri', 'Montaggio', 'TOTALE', '% Inc.'];
      const analysisColWidths = [120, 50, 70, 70, 70, 70, 70, 70, 90, 60];

      let analysisY = 70;
      doc.rect(40, analysisY, analysisColWidths.reduce((a, b) => a + b, 0), 22).fill(primaryColor);
      doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
      let analysisX = 45;
      analysisHeaders.forEach((h, i) => {
        doc.text(h, analysisX, analysisY + 7, { width: analysisColWidths[i] - 5 });
        analysisX += analysisColWidths[i];
      });

      analysisY += 22;
      doc.font('Helvetica').fontSize(8);

      const sortedKeys = Array.from(grouped.keys()).sort();
      let rowIdx = 0;

      sortedKeys.forEach((key) => {
        if (analysisY > 520) {
          doc.addPage();
          analysisY = 50;
          // Ripeti header
          doc.rect(40, analysisY, analysisColWidths.reduce((a, b) => a + b, 0), 22).fill(primaryColor);
          doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
          analysisX = 45;
          analysisHeaders.forEach((h, i) => {
            doc.text(h, analysisX, analysisY + 7, { width: analysisColWidths[i] - 5 });
            analysisX += analysisColWidths[i];
          });
          analysisY += 22;
          doc.font('Helvetica').fontSize(8);
        }

        const g = grouped.get(key);
        const tot = g.costoTaglio + g.costoOrlatura + g.costoStrobel + g.altriCosti + g.costoMontaggio;
        const perc = totalCosti > 0 ? (tot / totalCosti) * 100 : 0;

        if (rowIdx % 2 === 0) {
          doc.rect(40, analysisY, analysisColWidths.reduce((a, b) => a + b, 0), 18).fill('#F8F9FA');
        }
        doc.fillColor(secondaryColor);

        analysisX = 45;
        doc.text(key.substring(0, 18), analysisX, analysisY + 5, { width: analysisColWidths[0] - 5 });
        analysisX += analysisColWidths[0];
        doc.text(g.count.toString(), analysisX, analysisY + 5);
        analysisX += analysisColWidths[1];
        doc.text(g.quantita.toLocaleString('it-IT', { maximumFractionDigits: 0 }), analysisX, analysisY + 5);
        analysisX += analysisColWidths[2];
        doc.text(formatCurrency(g.costoTaglio), analysisX, analysisY + 5);
        analysisX += analysisColWidths[3];
        doc.text(formatCurrency(g.costoOrlatura), analysisX, analysisY + 5);
        analysisX += analysisColWidths[4];
        doc.text(formatCurrency(g.costoStrobel), analysisX, analysisY + 5);
        analysisX += analysisColWidths[5];
        doc.text(formatCurrency(g.altriCosti), analysisX, analysisY + 5);
        analysisX += analysisColWidths[6];
        doc.text(formatCurrency(g.costoMontaggio), analysisX, analysisY + 5);
        analysisX += analysisColWidths[7];
        doc.font('Helvetica-Bold').text(formatCurrency(tot), analysisX, analysisY + 5);
        analysisX += analysisColWidths[8];
        doc.font('Helvetica').text(`${perc.toFixed(1)}%`, analysisX, analysisY + 5);

        analysisY += 18;
        rowIdx++;
      });

      // ==================== PAGINA 3: ARTICOLI PER REPARTO (opzionale) ====================
      if (filters.includeArticoliPerReparto) {
        doc.addPage();

        doc.rect(0, 0, doc.page.width, 50).fill(primaryColor);
        doc.fillColor('#FFFFFF')
           .fontSize(18)
           .font('Helvetica-Bold')
           .text('DETTAGLIO ARTICOLI PER REPARTO E LINEA', 40, 15);

        // Raggruppa per reparto finale -> linea -> articolo
        const byRepartoLinea = new Map<string, Map<string, Map<string, any>>>();

        records.forEach((r: any) => {
          const repartoNome = r.repartoFinale?.nome || 'Non assegnato';
          const lineaNome = r.linea || 'Non specificata';
          const articoloNome = r.articolo || 'N/D';

          if (!byRepartoLinea.has(repartoNome)) {
            byRepartoLinea.set(repartoNome, new Map());
          }
          const lineaMap = byRepartoLinea.get(repartoNome)!;

          if (!lineaMap.has(lineaNome)) {
            lineaMap.set(lineaNome, new Map());
          }
          const articoloMap = lineaMap.get(lineaNome)!;

          if (!articoloMap.has(articoloNome)) {
            articoloMap.set(articoloNome, { quantita: 0, costo: 0, count: 0 });
          }
          const art = articoloMap.get(articoloNome)!;
          const qty = Number(r.quantita) || 0;
          art.quantita += qty;
          // Moltiplica costi unitari per quantità
          art.costo += ((Number(r.costoTaglio) || 0) + (Number(r.costoOrlatura) || 0) +
                       (Number(r.costoStrobel) || 0) + (Number(r.altriCosti) || 0) +
                       (Number(r.costoMontaggio) || 0)) * qty;
          art.count++;
        });

        let detailY = 70;
        const repartiSorted = Array.from(byRepartoLinea.keys()).sort();

        repartiSorted.forEach((repartoNome) => {
          if (detailY > 480) {
            doc.addPage();
            detailY = 50;
          }

          // Header reparto
          doc.rect(40, detailY, pageWidth, 20).fill(primaryColor);
          doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold')
             .text(`REPARTO: ${repartoNome}`, 45, detailY + 5);
          detailY += 25;

          const lineaMap = byRepartoLinea.get(repartoNome)!;
          const lineeSorted = Array.from(lineaMap.keys()).sort();

          lineeSorted.forEach((lineaNome) => {
            if (detailY > 500) {
              doc.addPage();
              detailY = 50;
            }

            // Subheader linea
            doc.rect(50, detailY, pageWidth - 20, 16).fill(accentColor);
            doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold')
               .text(`Linea: ${lineaNome}`, 55, detailY + 4);
            detailY += 20;

            // Mini header articoli
            doc.fillColor('#666').fontSize(7).font('Helvetica-Bold');
            doc.text('Articolo', 60, detailY);
            doc.text('N°', 250, detailY);
            doc.text('Quantità', 300, detailY);
            doc.text('Costo Totale', 380, detailY);
            detailY += 12;

            const articoloMap = lineaMap.get(lineaNome)!;
            const articoliSorted = Array.from(articoloMap.keys()).sort();

            doc.font('Helvetica').fontSize(7).fillColor(secondaryColor);
            articoliSorted.slice(0, 15).forEach((artNome) => { // Limita a 15 articoli per linea
              const art = articoloMap.get(artNome)!;
              doc.text(artNome.substring(0, 35), 60, detailY);
              doc.text(art.count.toString(), 250, detailY);
              doc.text(art.quantita.toLocaleString('it-IT', { maximumFractionDigits: 0 }), 300, detailY);
              doc.text(`€ ${art.costo.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`, 380, detailY);
              detailY += 10;
            });

            if (articoliSorted.length > 15) {
              doc.fillColor('#999').fontSize(7).font('Helvetica-Oblique')
                 .text(`... e altri ${articoliSorted.length - 15} articoli`, 60, detailY);
              detailY += 10;
            }

            detailY += 8;
          });

          detailY += 10;
        });
      }

      // ==================== FOOTER SU TUTTE LE PAGINE ====================
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.rect(0, doc.page.height - 30, doc.page.width, 30).fill('#F5F5F5');
        doc.fillColor('#666')
           .fontSize(8)
           .font('Helvetica')
           .text(
             `Pagina ${i + 1} di ${pages.count}  |  CoreGRE Sistema Analitico  |  Report generato automaticamente`,
             40,
             doc.page.height - 20,
             { align: 'center', width: pageWidth, lineBreak: false }
           );
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

function groupRecordsByRepartoFinale(
  records: any[],
  groupBy: string,
  repartoMap: Map<number, any>,
): Map<string, any> {
  const grouped = new Map<string, any>();

  records.forEach((r: any) => {
    let key: string;

    switch (groupBy) {
      case 'reparto':
        // USA REPARTO FINALE!
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
      });
    }

    const g = grouped.get(key);
    const qty = Number(r.quantita) || 0;
    g.count++;
    g.quantita += qty;
    // Moltiplica costo unitario per quantità
    g.costoTaglio += (Number(r.costoTaglio) || 0) * qty;
    g.costoOrlatura += (Number(r.costoOrlatura) || 0) * qty;
    g.costoStrobel += (Number(r.costoStrobel) || 0) * qty;
    g.altriCosti += (Number(r.altriCosti) || 0) * qty;
    g.costoMontaggio += (Number(r.costoMontaggio) || 0) * qty;
  });

  return grouped;
}

export default handler;
