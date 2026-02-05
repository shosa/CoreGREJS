import { JobHandler } from '../types';
import * as fs from 'fs';
import * as PDFDocument from 'pdfkit';

interface CsvRow {
  commessa_csv: string;
  commessa_estratta: string;
  fase: string;
  data: string;
  articolo: string;
  qta: number;
  cliente: string | null;
}

interface GroupedData {
  fase: string;
  data: string;
  items: CsvRow[];
  totale_qta: number;
}

const handler: JobHandler = async (payload, helpers) => {
  const { csvData, userId, jobId } = payload as { csvData: CsvRow[]; userId: number; jobId: string };
  const { ensureOutputPath } = helpers;

  if (!csvData || csvData.length === 0) {
    throw new Error('Nessun dato CSV disponibile per la generazione del report');
  }

  const fileName = `REPORT PRODUZIONE ${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`;
  const { fullPath } = await ensureOutputPath(userId, jobId, fileName);

  // Group data by Fase and Data
  const groupedDataMap = new Map<string, GroupedData>();
  let totaleGenerale = 0;

  for (const row of csvData) {
    const dataFormattata = formatDate(row.data);
    const key = `${row.fase}|${dataFormattata}`;

    if (!groupedDataMap.has(key)) {
      groupedDataMap.set(key, {
        fase: row.fase,
        data: dataFormattata,
        items: [],
        totale_qta: 0,
      });
    }

    const group = groupedDataMap.get(key)!;
    group.items.push(row);
    group.totale_qta += row.qta;
    totaleGenerale += row.qta;
  }

  const groupedData = Array.from(groupedDataMap.values());

  // Generate PDF
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
  });

  const writeStream = fs.createWriteStream(fullPath);
  doc.pipe(writeStream);

  // Header
  doc.fontSize(18).font('Helvetica-Bold').text('EMMEGIEMME SHOES SRL', { align: 'center' });
  doc.moveDown(2);

  // Draw groups
  for (const group of groupedData) {
    // Section header
    doc.fontSize(12).font('Helvetica-Bold')
      .fillColor('#333333')
      .text(`${group.fase} - ${group.data}`, { continued: false });
    doc.moveDown(0.5);

    // Table header - Commessa più stretta, Articolo più largo
    const startY = doc.y;
    const tableTop = startY;
    const colWidths = [140, 280, 80]; // Ridotta commessa da 200 a 140, aumentato articolo da 200 a 280
    const colPositions = [50, 200, 490];

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000');
    doc.text('Commessa Cliente', colPositions[0], tableTop, { width: colWidths[0], continued: false });
    doc.text('Articolo', colPositions[1], tableTop, { width: colWidths[1], continued: false });
    doc.text('Qta', colPositions[2], tableTop, { width: colWidths[2], align: 'center', continued: false });

    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    let currentY = tableTop + 20;

    // Table rows
    doc.fontSize(8).font('Helvetica');
    for (const item of group.items) {
      // Extract commessa from cliente field
      let commessaCli = '';
      if (item.cliente) {
        const match = item.cliente.match(/\(([^)]+)\)/);
        commessaCli = match ? match[1] : item.commessa_estratta || '';
      } else {
        commessaCli = item.commessa_estratta || '';
      }

      // Check if we need a new page
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }

      doc.text(commessaCli, colPositions[0], currentY, { width: colWidths[0], continued: false });
      doc.text(item.articolo, colPositions[1], currentY, { width: colWidths[1], continued: false });
      doc.text(item.qta.toString(), colPositions[2], currentY, { width: colWidths[2], align: 'center', continued: false });

      currentY += 15;
    }

    // Total row
    doc.moveTo(50, currentY).lineTo(550, currentY).stroke();
    currentY += 5;
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Totale', colPositions[0], currentY, { width: colWidths[0], continued: false });
    doc.text(group.totale_qta.toString(), colPositions[2], currentY, { width: colWidths[2], align: 'center', continued: false });

    doc.moveDown(2);
  }

  // Footer

  doc.end();

  await new Promise<void>((resolve, reject) => {
    writeStream.on('finish', () => resolve());
    writeStream.on('error', reject);
  });

  const stat = fs.statSync(fullPath);
  return {
    outputPath: fullPath,
    outputName: fileName,
    outputMime: 'application/pdf',
    outputSize: Number(stat.size)
  };
};

/**
 * Format date from CSV format to IT format
 * Example: "05/09/2025 07:44" -> "05/09/2025"
 */
function formatDate(dateStr: string): string {
  const parts = dateStr.split(' ');
  return parts[0] || dateStr;
}

export default handler;
