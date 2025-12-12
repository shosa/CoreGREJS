import PDFDocument = require('pdfkit');
import { JobHandler } from '../types';
import * as fs from 'fs';

const handler: JobHandler = async (payload, helpers) => {
  const { userId, jobId, dataInizio, dataFine, reparto, operatore, tipoCq } = payload as {
    userId: number;
    jobId: string;
    dataInizio?: string;
    dataFine?: string;
    reparto?: string;
    operatore?: string;
    tipoCq?: string;
  };
  const { ensureOutputPath } = helpers;

  // Reconstruct filters object from payload
  const filters = {
    dataInizio,
    dataFine,
    reparto,
    operatore,
    tipoCq,
  };

  const fileName = `REPORT_QUALITA_${new Date().toISOString().split('T')[0]}.pdf`;
  const { fullPath } = await ensureOutputPath(userId, jobId, fileName);

  // Genera il PDF usando il QualityService attraverso il metodo helper
  const buffer = await generateQualityReportPdf(filters, helpers);
  fs.writeFileSync(fullPath, buffer);

  const stat = fs.statSync(fullPath);
  return {
    outputPath: fullPath,
    outputName: fileName,
    outputMime: 'application/pdf',
    outputSize: Number(stat.size),
  };
};

async function generateQualityReportPdf(
  filters: any,
  helpers: any
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const { trackingService } = helpers;
      const prisma = (trackingService as any).prisma;

      // Build query conditions
      const where: any = {};
      if (filters.dataInizio || filters.dataFine) {
        where.dataControllo = {};
        if (filters.dataInizio) {
          where.dataControllo.gte = new Date(filters.dataInizio);
        }
        if (filters.dataFine) {
          const endDate = new Date(filters.dataFine);
          endDate.setHours(23, 59, 59, 999);
          where.dataControllo.lte = endDate;
        }
      }
      if (filters.reparto) where.reparto = filters.reparto;
      if (filters.operatore) where.operatore = { contains: filters.operatore };
      if (filters.tipoCq) where.tipoCq = filters.tipoCq;

      // Fetch data
      const records = await prisma.qualityRecord.findMany({
        where,
        include: {
          exceptions: true,
        },
        orderBy: { dataControllo: 'desc' },
      });

      // Get all operators to map matricola -> nome completo
      const operators = await prisma.inworkOperator.findMany({
        select: {
          matricola: true,
          nome: true,
          cognome: true,
        },
      });

      // Get all departments to map id -> nome_reparto
      const departments = await prisma.qualityDepartment.findMany({
        select: {
          id: true,
          nomeReparto: true,
        },
      });

      // Get all defect types to map id -> descrizione
      const defectTypes = await prisma.qualityDefectType.findMany({
        select: {
          id: true,
          descrizione: true,
        },
      });

      // Create operator map: matricola -> nome completo
      const operatorMap = new Map<string, string>();
      operators.forEach((op: any) => {
        operatorMap.set(op.matricola, `${op.nome} ${op.cognome}`);
      });

      // Create department map: id -> nome_reparto
      const departmentMap = new Map<string, string>();
      departments.forEach((dept: any) => {
        departmentMap.set(String(dept.id), dept.nomeReparto);
      });

      // Create defect type map: id -> descrizione
      const defectTypeMap = new Map<string, string>();
      defectTypes.forEach((defect: any) => {
        defectTypeMap.set(String(defect.id), defect.descrizione);
      });

      // Calculate statistics
      const totalRecords = records.length;
      const recordsWithExceptions = records.filter((r: any) => r.haEccezioni).length;
      const recordsOk = totalRecords - recordsWithExceptions;
      const successRate = totalRecords > 0 ? ((recordsOk / totalRecords) * 100).toFixed(2) : '0';

      // Group by department
      const byDepartment: Record<string, any> = {};
      records.forEach((r: any) => {
        // Map department ID to name
        const deptName = r.reparto ? (departmentMap.get(r.reparto) || r.reparto) : 'NON SPECIFICATO';
        if (!byDepartment[deptName]) {
          byDepartment[deptName] = { total: 0, exceptions: 0, ok: 0 };
        }
        byDepartment[deptName].total++;
        if (r.haEccezioni) {
          byDepartment[deptName].exceptions++;
        } else {
          byDepartment[deptName].ok++;
        }
      });

      // Group by operator (with full name)
      const byOperator: Record<string, any> = {};
      records.forEach((r: any) => {
        // Get operator full name from map, fallback to matricola if not found
        const operatorName = operatorMap.get(r.operatore) || r.operatore;
        if (!byOperator[operatorName]) {
          byOperator[operatorName] = { total: 0, exceptions: 0, ok: 0 };
        }
        byOperator[operatorName].total++;
        if (r.haEccezioni) {
          byOperator[operatorName].exceptions++;
        } else {
          byOperator[operatorName].ok++;
        }
      });

      // Count exception types
      const exceptionTypes: Record<string, number> = {};
      records.forEach((r: any) => {
        r.exceptions?.forEach((exc: any) => {
          // Map defect type ID to description
          const defectName = defectTypeMap.get(exc.tipoDifetto) || exc.tipoDifetto;
          exceptionTypes[defectName] = (exceptionTypes[defectName] || 0) + 1;
        });
      });

      // Create PDF
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('REPORT CONTROLLO QUALITÀ', { align: 'center' });

      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').text(`Generato il: ${new Date().toLocaleString('it-IT')}`, {
        align: 'center',
      });

      // Filters applied
      doc.moveDown(1);
      doc.fontSize(12).font('Helvetica-Bold').text('Filtri Applicati:');
      doc.fontSize(10).font('Helvetica');
      if (filters.dataInizio || filters.dataFine) {
        const start = filters.dataInizio || 'N/D';
        const end = filters.dataFine || 'N/D';
        doc.text(`Periodo: ${start} - ${end}`);
      }
      if (filters.reparto) doc.text(`Reparto: ${filters.reparto}`);
      if (filters.operatore) doc.text(`Operatore: ${filters.operatore}`);
      if (filters.tipoCq) doc.text(`Tipo CQ: ${filters.tipoCq}`);

      // Summary Statistics
      doc.moveDown(1.5);
      doc.fontSize(14).font('Helvetica-Bold').text('Riepilogo Statistiche');
      doc.moveDown(0.5);

      const summaryY = doc.y;
      doc.fontSize(10).font('Helvetica');

      // Box 1: Total Controls
      doc
        .rect(50, summaryY, 150, 60)
        .fillAndStroke('#E3F2FD', '#1976D2')
        .stroke();
      doc.fillColor('#000').text('Controlli Totali', 60, summaryY + 15);
      doc.fontSize(20).font('Helvetica-Bold').text(totalRecords.toString(), 60, summaryY + 30);

      // Box 2: With Exceptions
      doc.fontSize(10).font('Helvetica');
      doc
        .rect(220, summaryY, 150, 60)
        .fillAndStroke('#FFEBEE', '#D32F2F')
        .stroke();
      doc.fillColor('#000').text('Con Eccezioni', 230, summaryY + 15);
      doc.fontSize(20).font('Helvetica-Bold').text(recordsWithExceptions.toString(), 230, summaryY + 30);

      // Box 3: Success Rate
      doc.fontSize(10).font('Helvetica');
      doc
        .rect(390, summaryY, 150, 60)
        .fillAndStroke('#E8F5E9', '#388E3C')
        .stroke();
      doc.fillColor('#000').text('Tasso Successo', 400, summaryY + 15);
      doc.fontSize(20).font('Helvetica-Bold').text(`${successRate}%`, 400, summaryY + 30);

      doc.y = summaryY + 80;

      // By Department
      if (Object.keys(byDepartment).length > 0) {
        doc.moveDown(1);
        doc.fontSize(12).font('Helvetica-Bold').text('Analisi per Reparto');
        doc.moveDown(0.5);

        doc.fontSize(9).font('Helvetica-Bold');
        const tableTop = doc.y;

        // Header row with background
        doc.fillColor('#E3F2FD');
        doc.rect(50, tableTop - 5, 495, 18).fill();

        // Header text
        doc.fillColor('#000').text('Reparto', 55, tableTop);
        doc.text('Totale', 255, tableTop);
        doc.text('OK', 325, tableTop);
        doc.text('Eccezioni', 385, tableTop);
        doc.text('% Successo', 475, tableTop);

        // Vertical lines for column separation
        doc.strokeColor('#CCCCCC').lineWidth(0.5);
        doc.moveTo(245, tableTop - 5).lineTo(245, tableTop + 13).stroke();
        doc.moveTo(315, tableTop - 5).lineTo(315, tableTop + 13).stroke();
        doc.moveTo(375, tableTop - 5).lineTo(375, tableTop + 13).stroke();
        doc.moveTo(465, tableTop - 5).lineTo(465, tableTop + 13).stroke();

        let y = tableTop + 20;
        doc.fontSize(9).font('Helvetica');

        Object.keys(byDepartment)
          .sort()
          .forEach((dept, index) => {
            const stats = byDepartment[dept];
            const rate = ((stats.ok / stats.total) * 100).toFixed(1);

            // Alternate row background
            if (index % 2 === 0) {
              doc.fillColor('#F5F5F5');
              doc.rect(50, y - 3, 495, 18).fill();
            }

            doc.fillColor('#000');
            doc.text(dept.substring(0, 30), 55, y);
            doc.text(stats.total.toString(), 255, y);
            doc.text(stats.ok.toString(), 325, y);
            doc.text(stats.exceptions.toString(), 385, y);
            doc.text(`${rate}%`, 475, y);

            // Vertical lines for column separation
            doc.strokeColor('#CCCCCC').lineWidth(0.5);
            doc.moveTo(245, y - 3).lineTo(245, y + 15).stroke();
            doc.moveTo(315, y - 3).lineTo(315, y + 15).stroke();
            doc.moveTo(375, y - 3).lineTo(375, y + 15).stroke();
            doc.moveTo(465, y - 3).lineTo(465, y + 15).stroke();

            y += 20;

            if (y > 700) {
              doc.addPage();
              y = 50;
            }
          });

        doc.y = y + 10;
      }

      // By Operator
      if (Object.keys(byOperator).length > 0) {
        if (doc.y > 600) doc.addPage();

        doc.moveDown(1);
        doc.fontSize(12).font('Helvetica-Bold').text('Analisi per Operatore');
        doc.moveDown(0.5);

        doc.fontSize(9).font('Helvetica-Bold');
        const tableTop = doc.y;

        // Header row with background
        doc.fillColor('#E3F2FD');
        doc.rect(50, tableTop - 5, 495, 18).fill();

        // Header text
        doc.fillColor('#000').text('Operatore', 55, tableTop);
        doc.text('Totale', 255, tableTop);
        doc.text('OK', 325, tableTop);
        doc.text('Eccezioni', 385, tableTop);
        doc.text('% Successo', 475, tableTop);

        // Vertical lines for column separation
        doc.strokeColor('#CCCCCC').lineWidth(0.5);
        doc.moveTo(245, tableTop - 5).lineTo(245, tableTop + 13).stroke();
        doc.moveTo(315, tableTop - 5).lineTo(315, tableTop + 13).stroke();
        doc.moveTo(375, tableTop - 5).lineTo(375, tableTop + 13).stroke();
        doc.moveTo(465, tableTop - 5).lineTo(465, tableTop + 13).stroke();

        let y = tableTop + 20;
        doc.fontSize(9).font('Helvetica');

        Object.keys(byOperator)
          .sort()
          .forEach((op, index) => {
            const stats = byOperator[op];
            const rate = ((stats.ok / stats.total) * 100).toFixed(1);

            // Alternate row background
            if (index % 2 === 0) {
              doc.fillColor('#F5F5F5');
              doc.rect(50, y - 3, 495, 18).fill();
            }

            doc.fillColor('#000');
            doc.text(op.substring(0, 30), 55, y);
            doc.text(stats.total.toString(), 255, y);
            doc.text(stats.ok.toString(), 325, y);
            doc.text(stats.exceptions.toString(), 385, y);
            doc.text(`${rate}%`, 475, y);

            // Vertical lines for column separation
            doc.strokeColor('#CCCCCC').lineWidth(0.5);
            doc.moveTo(245, y - 3).lineTo(245, y + 15).stroke();
            doc.moveTo(315, y - 3).lineTo(315, y + 15).stroke();
            doc.moveTo(375, y - 3).lineTo(375, y + 15).stroke();
            doc.moveTo(465, y - 3).lineTo(465, y + 15).stroke();

            y += 20;

            if (y > 700) {
              doc.addPage();
              y = 50;
            }
          });

        doc.y = y + 10;
      }

      // Exception Types
      if (Object.keys(exceptionTypes).length > 0) {
        if (doc.y > 600) doc.addPage();

        doc.moveDown(1);
        doc.fontSize(12).font('Helvetica-Bold').text('Tipologie Difetti');
        doc.moveDown(0.5);

        doc.fontSize(9).font('Helvetica-Bold');
        const tableTop = doc.y;

        // Header row with background
        doc.fillColor('#E3F2FD');
        doc.rect(50, tableTop - 5, 495, 18).fill();

        // Header text
        doc.fillColor('#000').text('Tipo Difetto', 55, tableTop);
        doc.text('Occorrenze', 405, tableTop);

        // Vertical line for column separation
        doc.strokeColor('#CCCCCC').lineWidth(0.5);
        doc.moveTo(395, tableTop - 5).lineTo(395, tableTop + 13).stroke();

        let y = tableTop + 20;
        doc.fontSize(9).font('Helvetica');

        Object.entries(exceptionTypes)
          .sort((a, b) => b[1] - a[1])
          .forEach(([type, count], index) => {
            // Alternate row background
            if (index % 2 === 0) {
              doc.fillColor('#F5F5F5');
              doc.rect(50, y - 3, 495, 18).fill();
            }

            doc.fillColor('#000');
            doc.text(type.substring(0, 50), 55, y);
            doc.text(count.toString(), 405, y);

            // Vertical line for column separation
            doc.strokeColor('#CCCCCC').lineWidth(0.5);
            doc.moveTo(395, y - 3).lineTo(395, y + 15).stroke();

            y += 20;

            if (y > 700) {
              doc.addPage();
              y = 50;
            }
          });
      }

      // Footer
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#666')
          .text(
            `Pagina ${i + 1} di ${pages.count} - CoreGRE Quality Control System`,
            50,
            doc.page.height - 50,
            { align: 'center' }
          );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export default handler;
