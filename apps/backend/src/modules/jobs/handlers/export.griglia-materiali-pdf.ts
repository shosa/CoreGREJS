import PDFDocument = require('pdfkit');
import { JobHandler } from '../types';
import * as fs from 'fs';

const handler: JobHandler = async (payload, helpers) => {
  const { progressivo, userId, jobId, selectedArticles } = payload as {
    progressivo: string;
    userId: number;
    jobId: string;
    selectedArticles?: string[];
  };
  const { exportService, ensureOutputPath, waitForPdf } = helpers;

  // Fetch document with all related data
  const document = await exportService.getDocumentByProgressivo(progressivo);

  if (!document) {
    throw new Error(`Documento ${progressivo} non trovato`);
  }

  // Filter items based on selected articles
  const articlesToPrint = document.righe.filter(item => {
    if (!selectedArticles || selectedArticles.length === 0) {
      return true; // If no selection, print all
    }
    const codice = item.article?.codiceArticolo || item.codiceLibero;
    return codice && selectedArticles.includes(codice);
  });

  if (articlesToPrint.length === 0) {
    throw new Error('Nessun articolo selezionato trovato nel documento');
  }

  const fileName = `etichette_materiali_${progressivo}.pdf`;
  const { fullPath } = await ensureOutputPath(userId, jobId, fileName);

  const doc = new PDFDocument({
    margin: 40,
    size: 'A4',
    layout: 'portrait'
  });

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const margin = doc.page.margins.left;

  // Layout: 2 etichette per riga
  // Ogni etichetta: [QUADRATO][CODICE+DESCRIZIONE]
  const usableWidth = pageWidth - (margin * 2);
  const gapBetweenLabels = 20; // Spazio tra le due etichette
  const labelWidth = (usableWidth - gapBetweenLabels) / 2; // Larghezza di ogni etichetta

  const squareSize = 80; // Dimensione quadrato materiale
  const textWidth = labelWidth - squareSize; // Larghezza rettangolo testo
  const labelHeight = squareSize + 20; // Altezza etichetta + padding

  let currentY = margin;
  let labelIndex = 0;

  for (const item of articlesToPrint) {
    const codice = item.article?.codiceArticolo || item.codiceLibero || '-';
    const descrizione = item.article?.descrizione || item.descrizioneLibera || 'Nessuna descrizione';

    // Check if we need a new page
    if (currentY + labelHeight > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
      labelIndex = 0;
    }

    // Posizione nell'etichetta (0 = sinistra, 1 = destra)
    const position = labelIndex % 2;

    if (position === 0) {
      // Etichetta SINISTRA: [QUADRATO][TESTO]
      const squareX = margin;
      const textX = squareX + squareSize;

      // Draw square (for material sticker)
      doc.rect(squareX, currentY, squareSize, squareSize)
        .lineWidth(2)
        .stroke('#333333');

      // Draw text rectangle
      doc.rect(textX, currentY, textWidth, squareSize)
        .lineWidth(1)
        .stroke('#cccccc');

      // Draw codice
      doc.fillColor('#333333')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(codice, textX + 8, currentY + 10, {
          width: textWidth - 16,
          align: 'left'
        });

      // Draw descrizione
      doc.fontSize(9)
        .font('Helvetica')
        .text(descrizione, textX + 8, currentY + 30, {
          width: textWidth - 16,
          height: squareSize - 40,
          align: 'left',
          ellipsis: true
        });
    } else {
      // Etichetta DESTRA: [TESTO][QUADRATO]
      const textX = margin + labelWidth + gapBetweenLabels;
      const squareX = textX + textWidth;

      // Draw text rectangle
      doc.rect(textX, currentY, textWidth, squareSize)
        .lineWidth(1)
        .stroke('#cccccc');

      // Draw codice
      doc.fillColor('#333333')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(codice, textX + 8, currentY + 10, {
          width: textWidth - 16,
          align: 'left'
        });

      // Draw descrizione
      doc.fontSize(9)
        .font('Helvetica')
        .text(descrizione, textX + 8, currentY + 30, {
          width: textWidth - 16,
          height: squareSize - 40,
          align: 'left',
          ellipsis: true
        });

      // Draw square (for material sticker)
      doc.rect(squareX, currentY, squareSize, squareSize)
        .lineWidth(2)
        .stroke('#333333');

      // Move to next row after right label
      currentY += labelHeight;
    }

    labelIndex++;
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
