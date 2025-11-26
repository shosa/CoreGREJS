import PDFDocument = require('pdfkit');
import { JobHandler } from '../types';
import * as fs from 'fs';
import * as path from 'path';

const handler: JobHandler = async (payload, helpers) => {
  const { progressivo, userId, jobId } = payload as {
    progressivo: string;
    userId: number;
    jobId: string;
  };
  const { exportService, ensureOutputPath, waitForPdf } = helpers;

  // Fetch document with all related data
  const document = await exportService.getDocumentByProgressivo(progressivo);

  if (!document) {
    throw new Error(`Documento ${progressivo} non trovato`);
  }

  if (!document.piede || !document.piede.nColli) {
    throw new Error('Informazioni sui colli non trovate nel documento');
  }

  const fileName = `segnacolli_${progressivo}_${new Date().toISOString().split('T')[0]}.pdf`;
  const { fullPath } = await ensureOutputPath(userId, jobId, fileName);

  const doc = new PDFDocument({
    margin: 60,
    size: 'A4',
    layout: 'landscape'
  });

  const nColli = document.piede.nColli;
  const aspettoColli = document.piede.aspettoColli || 'Collo';
  const ragioneSociale = document.terzista.ragioneSociale;
  const idDocumento = document.id;

  // Logo path (se esiste)
  const logoPath = path.join(process.cwd(), 'public', 'assets', 'small_logo.png');
  const hasLogo = fs.existsSync(logoPath);

  // Genera una pagina per ogni collo - IDENTICO AL LEGACY
  for (let i = 1; i <= nColli; i++) {
    if (i > 1) {
      doc.addPage();
    }

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const centerX = pageWidth / 2;

    // Logo (se esiste)
    let currentY = 60;
    if (hasLogo) {
      try {
        doc.image(logoPath, centerX - 160, currentY, { width: 320 });
        currentY += 250;
      } catch (err) {
        // Logo non caricabile, continua senza
        currentY += 20;
      }
    }

    // X grande (40pt come nel Legacy)
    doc.fillColor('#000000')
      .fontSize(40)
      .font('Helvetica-Bold')
      .text('X', 0, currentY, { width: pageWidth, align: 'center' });

    currentY += 60;

    // Nome azienda con sfondo nero (60pt come nel Legacy)
    doc.rect(60, currentY, pageWidth - 120, 80)
      .fillAndStroke('#000000', '#000000');

    doc.fillColor('#FFFFFF')
      .fontSize(60)
      .font('Helvetica-Bold')
      .text(ragioneSociale, 80, currentY + 15, {
        width: pageWidth - 160,
        align: 'center'
      });

    currentY += 120;

    // Footer con DDT e Collo (25pt come nel Legacy)
    doc.fillColor('#000000')
      .fontSize(25)
      .font('Helvetica-Bold')
      .text(
        `DDT ${idDocumento} | ${aspettoColli} ${i} di ${nColli}`,
        -20,
        pageHeight - 100,
        { width: pageWidth, align: 'right' }
      );
  }

  await waitForPdf(doc, fullPath);
  const stat = fs.statSync(fullPath);

  return {
    outputPath: fullPath,
    outputName: fileName,
    outputMime: 'application/pdf',
    outputSize: Number(stat.size)
  };
};

export default handler;
