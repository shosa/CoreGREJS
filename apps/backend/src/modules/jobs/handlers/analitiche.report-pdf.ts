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
  } = payload as ReportFilters;

  const { ensureOutputPath, trackingService } = helpers;
  const prisma = (trackingService as any).prisma;

  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `REPORT_ANALITICHE_${groupBy.toUpperCase()}_${dateStr}.pdf`;
  const { fullPath } = await ensureOutputPath(userId, jobId, fileName);

  // Build query filters
  const where: any = {};
  if (dataFrom || dataTo) {
    where.dataDocumento = {};
    if (dataFrom) where.dataDocumento.gte = new Date(dataFrom);
    if (dataTo) {
      const endDate = new Date(dataTo);
      endDate.setHours(23, 59, 59, 999);
      where.dataDocumento.lte = endDate;
    }
  }
  if (repartoId) where.repartoId = repartoId;
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

  // Get all reparti for mapping
  const reparti = await prisma.analiticaReparto.findMany({
    orderBy: { ordine: 'asc' },
  });

  // ✅ FIX DEFINITIVO: Map tipizzata correttamente
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
      const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(18)
        .font('Helvetica-Bold')
        .text('REPORT ANALISI COSTI', { align: 'center' });

      doc.moveDown(0.5);
      doc.fontSize(10)
        .font('Helvetica')
        .text(`Generato il: ${new Date().toLocaleString('it-IT')}`, {
          align: 'center',
        });

      // Filters info
      doc.moveDown(1);
      doc.fontSize(11).font('Helvetica-Bold').text('Filtri Applicati:');
      doc.fontSize(9).font('Helvetica');

      if (filters.dataFrom || filters.dataTo) {
        doc.text(
          `Periodo: ${filters.dataFrom || 'inizio'} - ${filters.dataTo || 'oggi'}`,
        );
      }

      if (filters.repartoId) {
        const rep = repartoMap.get(filters.repartoId);
        doc.text(`Reparto: ${rep?.nome || filters.repartoId}`);
      }

      if (filters.tipoDocumento) {
        doc.text(`Tipo Documento: ${filters.tipoDocumento}`);
      }

      if (filters.linea) {
        doc.text(`Linea: ${filters.linea}`);
      }

      doc.text(`Raggruppamento: ${filters.groupBy}`);

      // Calculate totals
      let totalPaia = 0;
      let totalTaglio = 0;
      let totalOrlatura = 0;
      let totalStrobel = 0;
      let totalAltri = 0;
      let totalMontaggio = 0;

      records.forEach((r: any) => {
        totalPaia += Number(r.quantita) || 0;
        totalTaglio += Number(r.costoTaglio) || 0;
        totalOrlatura += Number(r.costoOrlatura) || 0;
        totalStrobel += Number(r.costoStrobel) || 0;
        totalAltri += Number(r.altriCosti) || 0;
        totalMontaggio += Number(r.costoMontaggio) || 0;
      });

      const totalCosti =
        totalTaglio +
        totalOrlatura +
        totalStrobel +
        totalAltri +
        totalMontaggio;

      // Summary boxes
      doc.moveDown(1.5);
      doc.fontSize(12).font('Helvetica-Bold').text('Riepilogo Generale');
      doc.moveDown(0.5);

      const boxY = doc.y;
      const boxWidth = 100;
      const boxHeight = 50;
      const boxGap = 10;

      drawBox(
        doc,
        40,
        boxY,
        boxWidth,
        boxHeight,
        '#E3F2FD',
        '#1976D2',
        'Record',
        records.length.toString(),
      );

      drawBox(
        doc,
        40 + boxWidth + boxGap,
        boxY,
        boxWidth,
        boxHeight,
        '#E8F5E9',
        '#388E3C',
        'Quantità Tot.',
        totalPaia.toLocaleString('it-IT'),
      );

      drawBox(
        doc,
        40 + (boxWidth + boxGap) * 2,
        boxY,
        boxWidth + 30,
        boxHeight,
        '#FFF3E0',
        '#E65100',
        'Costo Totale',
        `€ ${totalCosti.toLocaleString('it-IT', {
          minimumFractionDigits: 2,
        })}`,
      );

      const costoMedio = totalPaia > 0 ? totalCosti / totalPaia : 0;

      drawBox(
        doc,
        40 + (boxWidth + boxGap) * 2 + boxWidth + 40,
        boxY,
        boxWidth + 30,
        boxHeight,
        '#FCE4EC',
        '#C2185B',
        'Costo Unit.',
        `€ ${costoMedio.toLocaleString('it-IT', {
          minimumFractionDigits: 2,
        })}`,
      );

      doc.y = boxY + boxHeight + 20;

      // Cost breakdown table
      doc.fontSize(12).font('Helvetica-Bold').text('Dettaglio Costi');
      doc.moveDown(0.5);

      const costRows = [
        ['Taglio', totalTaglio, (totalTaglio / totalCosti) * 100 || 0],
        ['Orlatura', totalOrlatura, (totalOrlatura / totalCosti) * 100 || 0],
        ['Strobel', totalStrobel, (totalStrobel / totalCosti) * 100 || 0],
        ['Altri Costi', totalAltri, (totalAltri / totalCosti) * 100 || 0],
        ['Montaggio', totalMontaggio, (totalMontaggio / totalCosti) * 100 || 0],
      ];

      drawCostTable(doc, costRows);

      // Grouped analysis
      doc.addPage();
      doc.fontSize(14)
        .font('Helvetica-Bold')
        .text(
          `Analisi per ${
            filters.groupBy.charAt(0).toUpperCase() +
            filters.groupBy.slice(1)
          }`,
        );
      doc.moveDown(1);

      const grouped = groupRecords(records, filters.groupBy, repartoMap);
      drawGroupedTable(doc, grouped, filters.groupBy);

      // Footer
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8)
          .font('Helvetica')
          .fillColor('#666')
          .text(
            `Pagina ${i + 1} di ${pages.count} - CoreGRE Analitiche`,
            40,
            doc.page.height - 40,
            { align: 'center' },
          );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function drawBox(
  doc: any,
  x: number,
  y: number,
  w: number,
  h: number,
  bgColor: string,
  borderColor: string,
  label: string,
  value: string,
) {
  doc.rect(x, y, w, h).fillAndStroke(bgColor, borderColor);
  doc.fillColor('#000')
    .fontSize(8)
    .font('Helvetica')
    .text(label, x + 5, y + 8, { width: w - 10 });
  doc.fontSize(14)
    .font('Helvetica-Bold')
    .text(value, x + 5, y + 25, { width: w - 10 });
}

function drawCostTable(doc: any, rows: any[]) {
  const startY = doc.y;
  const colWidths = [150, 120, 100];
  const headers = ['Voce', 'Importo (€)', '% sul Totale'];

  doc.fillColor('#E3F2FD');
  doc.rect(40, startY, colWidths.reduce((a, b) => a + b, 0), 18).fill();
  doc.fillColor('#000').fontSize(9).font('Helvetica-Bold');

  let x = 45;
  headers.forEach((h, i) => {
    doc.text(h, x, startY + 5, { width: colWidths[i] - 10 });
    x += colWidths[i];
  });

  let y = startY + 22;
  doc.font('Helvetica').fontSize(9);

  rows.forEach((row, idx) => {
    if (idx % 2 === 0) {
      doc.fillColor('#F5F5F5');
      doc.rect(40, y - 3, colWidths.reduce((a, b) => a + b, 0), 18).fill();
    }

    doc.fillColor('#000');
    x = 45;

    doc.text(row[0], x, y, { width: colWidths[0] - 10 });
    x += colWidths[0];
    doc.text(
      `€ ${row[1].toLocaleString('it-IT', { minimumFractionDigits: 2 })}`,
      x,
      y,
      { width: colWidths[1] - 10 },
    );
    x += colWidths[1];
    doc.text(`${row[2].toFixed(1)}%`, x, y, {
      width: colWidths[2] - 10,
    });

    y += 18;
  });

  doc.y = y + 10;
}

function groupRecords(
  records: any[],
  groupBy: string,
  repartoMap: Map<number, any>,
): Map<string, any> {
  const grouped = new Map<string, any>();

  records.forEach((r: any) => {
    let key: string;

    switch (groupBy) {
      case 'reparto':
        key = r.reparto?.nome || 'Non assegnato';
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
    g.count++;
    g.quantita += Number(r.quantita) || 0;
    g.costoTaglio += Number(r.costoTaglio) || 0;
    g.costoOrlatura += Number(r.costoOrlatura) || 0;
    g.costoStrobel += Number(r.costoStrobel) || 0;
    g.altriCosti += Number(r.altriCosti) || 0;
    g.costoMontaggio += Number(r.costoMontaggio) || 0;
  });

  return grouped;
}

function drawGroupedTable(
  doc: any,
  grouped: Map<string, any>,
  groupBy: string,
) {
  const startY = doc.y;
  const colWidths = [140, 50, 60, 70, 70, 70];
  const headers = [
    groupBy.charAt(0).toUpperCase() + groupBy.slice(1),
    'Record',
    'Quantità',
    'Costo Tot.',
    'Costo Unit.',
    '% Totale',
  ];

  doc.fillColor('#E3F2FD');
  doc.rect(40, startY, colWidths.reduce((a, b) => a + b, 0), 18).fill();
  doc.fillColor('#000').fontSize(8).font('Helvetica-Bold');

  let x = 45;
  headers.forEach((h, i) => {
    doc.text(h, x, startY + 5, { width: colWidths[i] - 5 });
    x += colWidths[i];
  });

  let grandTotal = 0;
  grouped.forEach((g) => {
    grandTotal +=
      g.costoTaglio +
      g.costoOrlatura +
      g.costoStrobel +
      g.altriCosti +
      g.costoMontaggio;
  });

  let y = startY + 22;
  doc.font('Helvetica').fontSize(8);
  let rowIdx = 0;

  const sortedKeys = Array.from(grouped.keys()).sort();

  sortedKeys.forEach((key) => {
    const g = grouped.get(key);
    const totalCosto =
      g.costoTaglio +
      g.costoOrlatura +
      g.costoStrobel +
      g.altriCosti +
      g.costoMontaggio;

    const costoPerPaio = g.quantita > 0 ? totalCosto / g.quantita : 0;
    const percentuale =
      grandTotal > 0 ? (totalCosto / grandTotal) * 100 : 0;

    if (y > 750) {
      doc.addPage();
      y = 50;
    }

    if (rowIdx % 2 === 0) {
      doc.fillColor('#F5F5F5');
      doc.rect(
        40,
        y - 3,
        colWidths.reduce((a, b) => a + b, 0),
        16,
      ).fill();
    }

    doc.fillColor('#000');
    x = 45;

    doc.text(key.substring(0, 25), x, y, {
      width: colWidths[0] - 5,
      ellipsis: true,
    });
    x += colWidths[0];
    doc.text(g.count.toString(), x, y, {
      width: colWidths[1] - 5,
    });
    x += colWidths[1];
    doc.text(g.quantita.toLocaleString('it-IT'), x, y, {
      width: colWidths[2] - 5,
    });
    x += colWidths[2];
    doc.text(
      `€ ${totalCosto.toLocaleString('it-IT', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`,
      x,
      y,
      { width: colWidths[3] - 5 },
    );
    x += colWidths[3];
    doc.text(`€ ${costoPerPaio.toFixed(2)}`, x, y, {
      width: colWidths[4] - 5,
    });
    x += colWidths[4];
    doc.text(`${percentuale.toFixed(1)}%`, x, y, {
      width: colWidths[5] - 5,
    });

    y += 16;
    rowIdx++;
  });

  doc.y = y + 10;
}

export default handler;
