import PDFDocument = require('pdfkit');
import { JobHandler } from '../types';
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { getCompanyInfo, getLogoBuffer } from './company-info.helper';

const prisma = new PrismaClient();

/**
 * Helper: Separa articoli con voce doganale 64061010 dagli altri (come nel legacy)
 */
function separateArticlesByVoceDoganale(righe: any[]) {
  const priorityArticles: any[] = [];
  const otherArticles: any[] = [];

  const getVoce = (riga: any) =>
    riga.article?.voceDoganale || riga.voceLibera || '';

  righe.forEach((riga) => {
    if (!riga.isMancante && (riga.qtaReale || riga.qtaOriginale) > 0) {
      const voce = getVoce(riga);
      if (voce === '64061010') {
        priorityArticles.push(riga);
      } else {
        otherArticles.push(riga);
      }
    }
  });

  const voceCompare = (a: any, b: any) =>
    getVoce(a).localeCompare(getVoce(b), undefined, { numeric: true });

  return {
    priority: priorityArticles.sort(voceCompare),
    others: otherArticles.sort(voceCompare),
  };
}

/**
 * Helper: Raggruppa mancanti per DDT di origine (rifMancante)
 */
function groupMancantiByDDT(righe: any[]) {
  const grouped: Record<string, any[]> = {};

  righe.forEach((riga) => {
    if (riga.isMancante && (riga.qtaReale || riga.qtaOriginale) > 0) {
      const rif = riga.rifMancante || 'Senza riferimento';
      if (!grouped[rif]) {
        grouped[rif] = [];
      }
      grouped[rif].push(riga);
    }
  });

  return grouped;
}

/**
 * Helper: Gestisce interruzione pagina con chiusura tabella e riproduzione completa intestazione DDT
 */
function handlePageBreak(
  doc: any,
  currentY: number,
  pageHeight: number,
  marginX: number,
  marginY: number,
  usableWidth: number,
  rowHeight: number,
  colArticolo: number,
  colDescrizione: number,
  colNomCom: number,
  colUM: number,
  colQta: number,
  colValore: number,
  // Dati documento per riprodurre intestazione
  progressivo: string,
  terzista: any,
  data: string,
  stato: string,
  piede: any,
  logoBuffer: Buffer | null,
  hasLogo: boolean
) {
  // Chiudi bordo inferiore tabella
  doc
    .moveTo(marginX, currentY)
    .lineTo(marginX + usableWidth, currentY)
    .stroke();

  // Aggiungi "continua..." in corsivo a destra
  doc
    .fontSize(8)
    .fillColor('#666666')
    .font('Helvetica-Oblique')
    .text('continua...', marginX, currentY + 5, {
      width: usableWidth,
      align: 'right',
    });

  // Nuova pagina
  doc.addPage();
  currentY = marginY;

  // ========== RIPRODUZIONE COMPLETA INTESTAZIONE DDT ==========

  // TABELLA LOGO + DESTINATARIO
  const tableLogoHeight = 100;
  const logoColWidth = usableWidth * 0.45;
  const destColWidth = usableWidth * 0.55;

  // Box logo (sinistra)
  if (hasLogo && logoBuffer) {
    try {
      doc.image(logoBuffer, marginX + 10, currentY + 10, {
        width: logoColWidth - 20,
        height: tableLogoHeight - 20,
        fit: [logoColWidth - 20, tableLogoHeight - 20],
        align: 'center',
        valign: 'center',
      });
    } catch (err) {
      // Logo non caricabile
    }
  }

  // Box destinatario (destra)
  const destX = marginX + logoColWidth;
  const destY = currentY;

  doc.fontSize(10).fillColor('#000000').font('Helvetica-Bold').text('SPETT.LE:', destX + 5, destY + 5);

  doc.fontSize(12)
    .font('Helvetica-Bold')
    .text(terzista.ragioneSociale, destX + 5, destY + 20, {
      width: destColWidth - 10,
    });

  let destLineY = destY + 38;
  doc.fontSize(9).font('Helvetica');

  if (terzista.indirizzo1) {
    doc.text(terzista.indirizzo1, destX + 5, destLineY, {
      width: destColWidth - 10,
    });
    destLineY += 12;
  }
  if (terzista.indirizzo2) {
    doc.text(terzista.indirizzo2, destX + 5, destLineY, {
      width: destColWidth - 10,
    });
    destLineY += 12;
  }
  if (terzista.indirizzo3) {
    doc.text(terzista.indirizzo3, destX + 5, destLineY, {
      width: destColWidth - 10,
    });
    destLineY += 12;
  }
  if (terzista.nazione) {
    doc.text(terzista.nazione, destX + 5, destLineY, {
      width: destColWidth - 10,
    });
  }

  // Bordo tabella logo+destinatario
  doc.rect(marginX, currentY, logoColWidth, tableLogoHeight).stroke();
  doc.rect(destX, currentY, destColWidth, tableLogoHeight).stroke();

  currentY += tableLogoHeight + 15;

  // TITOLO DDT
  doc.fontSize(16).fillColor('#000000').font('Helvetica-Bold');
  doc.text(`DDT VALORIZZATO n° ${progressivo}`, marginX, currentY, {
    width: usableWidth,
    align: 'left',
  });

  if (stato === 'Aperto') {
    doc.fontSize(14)
      .fillColor('#CC0000')
      .font('Helvetica-Bold')
      .text('PROVVISORIO DA CHIUDERE', marginX + 280, currentY);
  }

  currentY += 30;

  // INFORMAZIONI DOCUMENTO
  const infoTableY = currentY;
  const infoRowHeight = 20;

  // Colonne (prime due pi� strette) + colonna pagina
  const col1W = usableWidth * 0.22;
  const col2W = usableWidth * 0.22;
  const col3W = usableWidth * 0.14;
  const col4W = usableWidth * 0.14;
  const col5W = usableWidth * 0.14;
  const col6W = usableWidth * 0.14;

  // Bordi interni alleggeriti
  doc.save();
  doc.lineWidth(0.4);
  doc.rect(marginX, infoTableY, col1W, infoRowHeight).stroke();
  doc.rect(marginX + col1W, infoTableY, col2W, infoRowHeight).stroke();
  doc.rect(marginX + col1W + col2W, infoTableY, col3W, infoRowHeight).stroke();
  doc.rect(marginX + col1W + col2W + col3W, infoTableY, col4W, infoRowHeight).stroke();
  doc.rect(marginX + col1W + col2W + col3W + col4W, infoTableY, col5W, infoRowHeight).stroke();
  doc.rect(marginX + col1W + col2W + col3W + col4W + col5W, infoTableY, col6W, infoRowHeight).stroke();
  doc.rect(marginX, infoTableY + infoRowHeight, col1W, infoRowHeight).stroke();
  doc.rect(marginX + col1W, infoTableY + infoRowHeight, col2W, infoRowHeight).stroke();
  doc.rect(marginX + col1W + col2W, infoTableY + infoRowHeight, col3W, infoRowHeight).stroke();
  doc.rect(marginX + col1W + col2W + col3W, infoTableY + infoRowHeight, col4W, infoRowHeight).stroke();
  doc.rect(marginX + col1W + col2W + col3W + col4W, infoTableY + infoRowHeight, col5W, infoRowHeight).stroke();
  doc.rect(marginX + col1W + col2W + col3W + col4W + col5W, infoTableY + infoRowHeight, col6W, infoRowHeight).stroke();
  doc.restore();
  // Bordi esterni più marcati e allineati
  doc.save();
  doc.lineWidth(1);
  doc.rect(marginX, infoTableY, usableWidth, infoRowHeight * 2).stroke();
  doc.restore();

  // Prima riga: label/valore
  doc.fontSize(8).fillColor('#000000').font('Helvetica-Bold');
  doc.text('TIPO DOCUMENTO:', marginX + 2, infoTableY + 6, { width: col1W - 4 });
  doc.fontSize(8).font('Helvetica');
  doc.text('DDT VALORIZZATO', marginX + col1W + 2, infoTableY + 6, { width: col2W - 4 });

  doc.fontSize(8).font('Helvetica-Bold');
  doc.text('N° DOCUMENTO:', marginX + col1W + col2W + 2, infoTableY + 6, { width: col3W - 4 });
  doc.fontSize(8).font('Helvetica');
  doc.text(progressivo, marginX + col1W + col2W + col3W + 2, infoTableY + 6, { width: col4W - 4 });

  doc.fontSize(8).font('Helvetica-Bold');
  doc.text('DATA:', marginX + col1W + col2W + col3W + col4W + 2, infoTableY + 6, {
    width: col5W - 4,
  });
  doc.fontSize(8).font('Helvetica');
  doc.text(
    new Date(data).toLocaleDateString('it-IT'),
    marginX + col1W + col2W + col3W + col4W + col5W + 2,
    infoTableY + 6,
    { width: col6W - 4 }
  );

  // Seconda riga: label/valore allineati sotto
  doc.fontSize(8).font('Helvetica-Bold');
  doc.text('TRASPORTATORE:', marginX + 2, infoTableY + infoRowHeight + 6, { width: col1W - 4 });
  doc.fontSize(8).font('Helvetica');
  doc.text(piede?.trasportatore || '', marginX + col1W + 2, infoTableY + infoRowHeight + 6, {
    width: col2W - 4,
  });

  doc.fontSize(8).font('Helvetica-Bold');
  doc.text('CONSEGNA:', marginX + col1W + col2W + 2, infoTableY + infoRowHeight + 6, {
    width: col3W - 4,
  });
  doc.fontSize(8).font('Helvetica');
  doc.text(terzista.consegna || '', marginX + col1W + col2W + col3W + 2, infoTableY + infoRowHeight + 6, {
    width: col4W - 4,
  });

  doc.fontSize(8).font('Helvetica-Bold');
  doc.text('PAGINA:', marginX + col1W + col2W + col3W + col4W + 2, infoTableY + infoRowHeight + 6, {
    width: col5W - 4,
  });
  // Valore pagina in col6 verrà inserito dopo

  currentY = infoTableY + infoRowHeight * 2 + 15;

  // Header tabella articoli
  doc.save();
  doc.lineWidth(0.4);
  doc.rect(marginX, currentY, usableWidth, rowHeight).fillAndStroke('#e0e0e0', '#000000');

  doc.fontSize(8).fillColor('#000000').font('Helvetica-Bold');
  doc.text('ARTICOLO', marginX + 2, currentY + 4, { width: colArticolo - 4 });
  doc.text('DESCRIZIONE', marginX + colArticolo + 2, currentY + 4, {
    width: colDescrizione - 4,
  });
  doc.text('NOM.COM.', marginX + colArticolo + colDescrizione + 2, currentY + 4, {
    width: colNomCom - 4,
  });
  doc.text('UM', marginX + colArticolo + colDescrizione + colNomCom + 2, currentY + 4, {
    width: colUM - 4,
  });
  doc.text(
    'QTA',
    marginX + colArticolo + colDescrizione + colNomCom + colUM + 2,
    currentY + 4,
    { width: colQta - 4 }
  );
  doc.text(
    'VALORE',
    marginX + colArticolo + colDescrizione + colNomCom + colUM + colQta + 2,
    currentY + 4,
    { width: colValore - 4 }
  );

  currentY += rowHeight;

  // SAFETY CHECK: Se dopo l'header siamo già oltre il limite, forza una posizione sicura
  if (currentY > pageHeight - 150) {
    console.warn('Header troppo grande dopo page break, forzando posizione sicura');
    currentY = marginY + 400; // Posizione fissa dopo header
  }

  return currentY;
}

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

  // Leggi dati aziendali
  const company = await getCompanyInfo(prisma);

  const fileName = `DDT ${progressivo}_${new Date().toISOString().split('T')[0]}.pdf`;
  const { fullPath } = await ensureOutputPath(userId, jobId, fileName);

  const doc = new PDFDocument({
    margin: 30,
    size: 'A4',
    layout: 'portrait',
    bufferPages: true, // necessario per inserire numerazione a posteriori
  });

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const marginX = 30;
  const marginY = 30;
  const usableWidth = pageWidth - marginX * 2;

  // Logo da MinIO (fallback: nessun logo)
  const logoBuffer = await getLogoBuffer(prisma);
  const hasLogo = logoBuffer !== null;

  let currentY = marginY;

  // ========== TABELLA LOGO + DESTINATARIO ==========
  const tableLogoHeight = 100;
  const logoColWidth = usableWidth * 0.45;
  const destColWidth = usableWidth * 0.55;

  // Box logo (sinistra) - logo + dati aziendali mittente
  if (hasLogo) {
    try {
      const logoDisplayHeight = tableLogoHeight * 0.55;
      doc.image(logoBuffer!, marginX + 5, currentY + 5, {
        width: logoColWidth - 10,
        height: logoDisplayHeight - 5,
        fit: [logoColWidth - 10, logoDisplayHeight - 5],
        align: 'center',
        valign: 'center',
      });
    } catch (err) {
      // Logo non caricabile
    }
  }
  // Dati aziendali mittente
  const companyTopY = hasLogo ? currentY + tableLogoHeight * 0.58 : currentY + 8;
  if (company.nomeAzienda) {
    doc.fontSize(hasLogo ? 7.5 : 9.5).font('Helvetica-Bold').fillColor('#000000')
      .text(company.nomeAzienda, marginX + 5, companyTopY, { width: logoColWidth - 10, align: 'center' });
  }
  const addrLine = [company.indirizzo, [company.cap, company.citta, company.provincia].filter(Boolean).join(' ')].filter(Boolean).join('\n');
  if (addrLine) {
    doc.fontSize(7).font('Helvetica').fillColor('#333333')
      .text(addrLine, marginX + 5, companyTopY + (hasLogo ? 12 : 16), { width: logoColWidth - 10, align: 'center' });
  }
  const contactLine = [company.partitaIva ? `P.IVA: ${company.partitaIva}` : '', company.telefono ? `Tel: ${company.telefono}` : ''].filter(Boolean).join('  |  ');
  if (contactLine) {
    doc.fontSize(6.5).font('Helvetica').fillColor('#555555')
      .text(contactLine, marginX + 5, companyTopY + (hasLogo ? 26 : 34), { width: logoColWidth - 10, align: 'center' });
  }

  // Box destinatario (destra)
  const destX = marginX + logoColWidth;
  const destY = currentY;

  doc.fontSize(10).fillColor('#000000').font('Helvetica-Bold').text('SPETT.LE:', destX + 5, destY + 5);

  doc.fontSize(12)
    .font('Helvetica-Bold')
    .text(document.terzista.ragioneSociale, destX + 5, destY + 20, {
      width: destColWidth - 10,
    });

  let destLineY = destY + 38;
  doc.fontSize(9).font('Helvetica');

  if (document.terzista.indirizzo1) {
    doc.text(document.terzista.indirizzo1, destX + 5, destLineY, {
      width: destColWidth - 10,
    });
    destLineY += 12;
  }
  if (document.terzista.indirizzo2) {
    doc.text(document.terzista.indirizzo2, destX + 5, destLineY, {
      width: destColWidth - 10,
    });
    destLineY += 12;
  }
  if (document.terzista.indirizzo3) {
    doc.text(document.terzista.indirizzo3, destX + 5, destLineY, {
      width: destColWidth - 10,
    });
    destLineY += 12;
  }
  if (document.terzista.nazione) {
    doc.text(document.terzista.nazione, destX + 5, destLineY, {
      width: destColWidth - 10,
    });
  }

  // Bordo tabella logo+destinatario
  doc.rect(marginX, currentY, logoColWidth, tableLogoHeight).stroke();
  doc.rect(destX, currentY, destColWidth, tableLogoHeight).stroke();

  currentY += tableLogoHeight + 15;

  // ========== TITOLO DDT ==========
  doc.fontSize(16).fillColor('#000000').font('Helvetica-Bold');
  doc.text(`DDT VALORIZZATO n° ${progressivo}`, marginX, currentY, {
    width: usableWidth,
    align: 'left',
  });

  if (document.stato === 'Aperto') {
    doc.fontSize(14)
      .fillColor('#CC0000')
      .font('Helvetica-Bold')
      .text('PROVVISORIO DA CHIUDERE', marginX + 280, currentY);
  }

  currentY += 30;

  // ========== INFORMAZIONI DOCUMENTO ==========
  const infoTableY = currentY;
  const infoRowHeight = 20;

  // Colonne (prime due pi� strette) + colonna pagina
  const col1W = usableWidth * 0.22;
  const col2W = usableWidth * 0.22;
  const col3W = usableWidth * 0.14;
  const col4W = usableWidth * 0.14;
  const col5W = usableWidth * 0.14;
  const col6W = usableWidth * 0.14;

  doc.rect(marginX, infoTableY, col1W, infoRowHeight).stroke();
  doc.rect(marginX + col1W, infoTableY, col2W, infoRowHeight).stroke();
  doc.rect(marginX + col1W + col2W, infoTableY, col3W, infoRowHeight).stroke();
  doc.rect(marginX + col1W + col2W + col3W, infoTableY, col4W, infoRowHeight).stroke();
  doc.rect(marginX + col1W + col2W + col3W + col4W, infoTableY, col5W, infoRowHeight).stroke();
  doc.rect(marginX + col1W + col2W + col3W + col4W + col5W, infoTableY, col6W, infoRowHeight).stroke();
  doc.rect(marginX, infoTableY + infoRowHeight, col1W, infoRowHeight).stroke();
  doc.rect(marginX + col1W, infoTableY + infoRowHeight, col2W, infoRowHeight).stroke();
  doc.rect(marginX + col1W + col2W, infoTableY + infoRowHeight, col3W, infoRowHeight).stroke();
  doc.rect(marginX + col1W + col2W + col3W, infoTableY + infoRowHeight, col4W, infoRowHeight).stroke();
  doc.rect(marginX + col1W + col2W + col3W + col4W, infoTableY + infoRowHeight, col5W, infoRowHeight).stroke();
  doc.rect(marginX + col1W + col2W + col3W + col4W + col5W, infoTableY + infoRowHeight, col6W, infoRowHeight).stroke();

  doc.fontSize(8).fillColor('#000000').font('Helvetica-Bold');
  doc.text('TIPO DOCUMENTO:', marginX + 2, infoTableY + 6, {
    width: col1W - 4,
  });
  doc.fontSize(8).font('Helvetica');
  doc.text('DDT VALORIZZATO', marginX + col1W + 2, infoTableY + 6, {
    width: col2W - 4,
  });

  doc.fontSize(8).font('Helvetica-Bold');
  doc.text('N° DOCUMENTO:', marginX + col1W + col2W + 2, infoTableY + 6, {
    width: col3W - 4,
  });
  doc.fontSize(8).font('Helvetica');
  doc.text(progressivo, marginX + col1W + col2W + col3W + 2, infoTableY + 6, {
    width: col4W - 4,
  });

  doc.fontSize(8).font('Helvetica-Bold');
  doc.text('DATA:', marginX + col1W + col2W + col3W + col4W + 2, infoTableY + 6, {
    width: col5W - 4,
  });
  doc.fontSize(8).font('Helvetica');
  doc.text(
    new Date(document.data).toLocaleDateString('it-IT'),
    marginX + col1W + col2W + col3W + col4W + col5W + 2,
    infoTableY + 6,
    { width: col6W - 4 }
  );

  // Seconda riga: label/valore allineati sotto
  doc.fontSize(8).font('Helvetica-Bold');
  doc.text('TRASPORTATORE:', marginX + 2, infoTableY + infoRowHeight + 6, {
    width: col1W - 4,
  });
  doc.fontSize(8).font('Helvetica');
  doc.text(
    document.piede?.trasportatore || '',
    marginX + col1W + 2,
    infoTableY + infoRowHeight + 6,
    { width: col2W - 4 }
  );

  doc.fontSize(8).font('Helvetica-Bold');
  doc.text(
    'CONSEGNA:',
    marginX + col1W + col2W + 2,
    infoTableY + infoRowHeight + 6,
    { width: col3W - 4 }
  );
  doc.fontSize(8).font('Helvetica');
  doc.text(
    document.terzista.consegna || '',
    marginX + col1W + col2W + col3W + 2,
    infoTableY + infoRowHeight + 6,
    { width: col4W - 4 }
  );

  // Colonna pagina (testo aggiunto dopo con numerazione definitiva)
  doc.fontSize(8).font('Helvetica-Bold');
  doc.text(
    'PAGINA:',
    marginX + col1W + col2W + col3W + col4W + 2,
    infoTableY + infoRowHeight + 6,
    { width: col5W - 4 }
  );
  // Valore pagina in col6 verrà inserito dopo

  currentY = infoTableY + infoRowHeight * 2 + 15;

  // ========== TABELLA ARTICOLI ==========
  const tableStartY = currentY;
  const rowHeight = 16; // Aumentato per maggiore interlinea

  // Colonne: ARTICOLO | DESCRIZIONE | NOM.COM. | UM | QTA | VALORE
  // Descrizione molto larga, altre compresse al minimo
  const colArticolo = usableWidth * 0.13;
  const colDescrizione = usableWidth * 0.54;
  const colNomCom = usableWidth * 0.11;
  const colUM = usableWidth * 0.05;
  const colQta = usableWidth * 0.06;
  const colValore = usableWidth * 0.11;

  const articleSectionStartY = currentY;

  // Header tabella
  doc.save();
  doc.lineWidth(0.4);
  doc.rect(marginX, currentY, usableWidth, rowHeight).fillAndStroke('#e0e0e0', '#000000');
  doc.restore();

  doc.fontSize(8).fillColor('#000000').font('Helvetica-Bold');
  doc.text('ARTICOLO', marginX + 2, currentY + 4, { width: colArticolo - 4 });
  doc.text('DESCRIZIONE', marginX + colArticolo + 2, currentY + 4, {
    width: colDescrizione - 4,
  });
  doc.text('NOM.COM.', marginX + colArticolo + colDescrizione + 2, currentY + 4, {
    width: colNomCom - 4,
  });
  doc.text('UM', marginX + colArticolo + colDescrizione + colNomCom + 2, currentY + 4, {
    width: colUM - 4,
  });
  doc.text(
    'QTA',
    marginX + colArticolo + colDescrizione + colNomCom + colUM + 2,
    currentY + 4,
    { width: colQta - 4 }
  );
  doc.text(
    'VALORE',
    marginX + colArticolo + colDescrizione + colNomCom + colUM + colQta + 2,
    currentY + 4,
    { width: colValore - 4 }
  );

  currentY += rowHeight;

  let totalValue = 0;
  let hasArticles = false;

  // Separa articoli prioritari (64061010) da altri
  const { priority, others } = separateArticlesByVoceDoganale(document.righe);

  // Stampa articoli prioritari
  for (const riga of priority) {
    hasArticles = true;
    const codice = riga.article?.codiceArticolo || riga.codiceLibero || '';
    const descrizione = riga.article?.descrizione || riga.descrizioneLibera || '';
    const nomCom = riga.article?.voceDoganale || riga.voceLibera || '';
    const um = riga.article?.um || riga.umLibera || '';
    const qta = riga.qtaReale || riga.qtaOriginale;
    const prezzo = riga.article?.prezzoUnitario || riga.prezzoLibero || 0;
    const subtotal = Math.round(qta * Number(prezzo) * 100) / 100;
    totalValue += subtotal;

    // Check spazio per nuova pagina con chiusura tabella
    if (currentY + rowHeight > pageHeight - 120) {
      currentY = handlePageBreak(
        doc,
        currentY,
        pageHeight,
        marginX,
        marginY,
        usableWidth,
        rowHeight,
        colArticolo,
        colDescrizione,
        colNomCom,
        colUM,
        colQta,
        colValore,
        progressivo,
        document.terzista,
        String(document.data),
        document.stato,
        document.piede,
        logoBuffer,
        hasLogo
      );
    }

    doc.fontSize(7).fillColor('#000000').font('Helvetica');
    doc.lineWidth(0.4);

    // Bordi verticali
    doc
      .moveTo(marginX, currentY)
      .lineTo(marginX, currentY + rowHeight)
      .stroke();
    doc
      .moveTo(marginX + colArticolo, currentY)
      .lineTo(marginX + colArticolo, currentY + rowHeight)
      .stroke();
    doc
      .moveTo(marginX + colArticolo + colDescrizione, currentY)
      .lineTo(marginX + colArticolo + colDescrizione, currentY + rowHeight)
      .stroke();
    doc
      .moveTo(marginX + colArticolo + colDescrizione + colNomCom, currentY)
      .lineTo(marginX + colArticolo + colDescrizione + colNomCom, currentY + rowHeight)
      .stroke();
    doc
      .moveTo(marginX + colArticolo + colDescrizione + colNomCom + colUM, currentY)
      .lineTo(
        marginX + colArticolo + colDescrizione + colNomCom + colUM,
        currentY + rowHeight
      )
      .stroke();
    doc
      .moveTo(marginX + colArticolo + colDescrizione + colNomCom + colUM + colQta, currentY)
      .lineTo(
        marginX + colArticolo + colDescrizione + colNomCom + colUM + colQta,
        currentY + rowHeight
      )
      .stroke();
    doc
      .moveTo(marginX + usableWidth, currentY)
      .lineTo(marginX + usableWidth, currentY + rowHeight)
      .stroke();

    doc.text(codice, marginX + 2, currentY + 3, {
      width: colArticolo - 4,
      lineBreak: false,
    });
    doc.text(descrizione, marginX + colArticolo + 2, currentY + 3, {
      width: colDescrizione - 4,
      lineBreak: false,
    });
    doc.text(nomCom, marginX + colArticolo + colDescrizione + 2, currentY + 3, {
      width: colNomCom - 4,
      lineBreak: false,
    });
    doc.text(um, marginX + colArticolo + colDescrizione + colNomCom + 2, currentY + 3, {
      width: colUM - 4,
      lineBreak: false,
    });
    doc.text(
      String(qta),
      marginX + colArticolo + colDescrizione + colNomCom + colUM + 2,
      currentY + 3,
      { width: colQta - 4, lineBreak: false }
    );
    doc.text(
      subtotal.toFixed(2).replace('.', ','),
      marginX + colArticolo + colDescrizione + colNomCom + colUM + colQta + 2,
      currentY + 3,
      { width: colValore - 4, lineBreak: false }
    );

    currentY += rowHeight;
  }

  // Se ci sono sia prioritari che altri, aggiungi riga "COMPLETE DI ACCESSORI:"
  if (priority.length > 0 && others.length > 0) {
    if (currentY + rowHeight > pageHeight - 120) {
      currentY = handlePageBreak(
        doc,
        currentY,
        pageHeight,
        marginX,
        marginY,
        usableWidth,
        rowHeight,
        colArticolo,
        colDescrizione,
        colNomCom,
        colUM,
        colQta,
        colValore,
        progressivo,
        document.terzista,
        String(document.data),
        document.stato,
        document.piede,
        logoBuffer,
        hasLogo
      );
    }

    // Bordi verticali
    doc
      .moveTo(marginX, currentY)
      .lineTo(marginX, currentY + rowHeight)
      .stroke();
    doc
      .moveTo(marginX + usableWidth, currentY)
      .lineTo(marginX + usableWidth, currentY + rowHeight)
      .stroke();

    doc.fontSize(8).fillColor('#000000').font('Helvetica-Bold');
    doc.text('COMPLETE DI ACCESSORI:', marginX + 2, currentY + 3, {
      width: usableWidth - 4,
    });

    currentY += rowHeight;
  }

  // Stampa altri articoli
  for (const riga of others) {
    hasArticles = true;
    const codice = riga.article?.codiceArticolo || riga.codiceLibero || '';
    const descrizione = riga.article?.descrizione || riga.descrizioneLibera || '';
    const nomCom = riga.article?.voceDoganale || riga.voceLibera || '';
    const um = riga.article?.um || riga.umLibera || '';
    const qta = riga.qtaReale || riga.qtaOriginale;
    const prezzo = riga.article?.prezzoUnitario || riga.prezzoLibero || 0;
    const subtotal = Math.round(qta * Number(prezzo) * 100) / 100;
    totalValue += subtotal;

    if (currentY + rowHeight > pageHeight - 120) {
      currentY = handlePageBreak(
        doc,
        currentY,
        pageHeight,
        marginX,
        marginY,
        usableWidth,
        rowHeight,
        colArticolo,
        colDescrizione,
        colNomCom,
        colUM,
        colQta,
        colValore,
        progressivo,
        document.terzista,
        String(document.data),
        document.stato,
        document.piede,
        logoBuffer,
        hasLogo
      );
    }

    doc.fontSize(7).fillColor('#000000').font('Helvetica');

    // Bordi verticali
    doc
      .moveTo(marginX, currentY)
      .lineTo(marginX, currentY + rowHeight)
      .stroke();
    doc
      .moveTo(marginX + colArticolo, currentY)
      .lineTo(marginX + colArticolo, currentY + rowHeight)
      .stroke();
    doc
      .moveTo(marginX + colArticolo + colDescrizione, currentY)
      .lineTo(marginX + colArticolo + colDescrizione, currentY + rowHeight)
      .stroke();
    doc
      .moveTo(marginX + colArticolo + colDescrizione + colNomCom, currentY)
      .lineTo(marginX + colArticolo + colDescrizione + colNomCom, currentY + rowHeight)
      .stroke();
    doc
      .moveTo(marginX + colArticolo + colDescrizione + colNomCom + colUM, currentY)
      .lineTo(
        marginX + colArticolo + colDescrizione + colNomCom + colUM,
        currentY + rowHeight
      )
      .stroke();
    doc
      .moveTo(marginX + colArticolo + colDescrizione + colNomCom + colUM + colQta, currentY)
      .lineTo(
        marginX + colArticolo + colDescrizione + colNomCom + colUM + colQta,
        currentY + rowHeight
      )
      .stroke();
    doc
      .moveTo(marginX + usableWidth, currentY)
      .lineTo(marginX + usableWidth, currentY + rowHeight)
      .stroke();

    doc.text(codice, marginX + 2, currentY + 3, {
      width: colArticolo - 4,
      lineBreak: false,
    });
    doc.text(descrizione, marginX + colArticolo + 2, currentY + 3, {
      width: colDescrizione - 4,
      lineBreak: false,
    });
    doc.text(nomCom, marginX + colArticolo + colDescrizione + 2, currentY + 3, {
      width: colNomCom - 4,
      lineBreak: false,
    });
    doc.text(um, marginX + colArticolo + colDescrizione + colNomCom + 2, currentY + 3, {
      width: colUM - 4,
      lineBreak: false,
    });
    doc.text(
      String(qta),
      marginX + colArticolo + colDescrizione + colNomCom + colUM + 2,
      currentY + 3,
      { width: colQta - 4, lineBreak: false }
    );
    doc.text(
      subtotal.toFixed(2).replace('.', ','),
      marginX + colArticolo + colDescrizione + colNomCom + colUM + colQta + 2,
      currentY + 3,
      { width: colValore - 4, lineBreak: false }
    );

    currentY += rowHeight;
  }

  // Mancanti raggruppati per DDT
  const mancantiGrouped = groupMancantiByDDT(document.righe);
  const mancantiSectionStartY = currentY;

  // Separatore finale articoli
  if (hasArticles) {
    doc.save();
    doc.lineWidth(1);
    if (currentY + 2 > pageHeight - 80) {
      currentY = handlePageBreak(
        doc,
        currentY,
        pageHeight,
        marginX,
        marginY,
        usableWidth,
        rowHeight,
        colArticolo,
        colDescrizione,
        colNomCom,
        colUM,
        colQta,
        colValore,
        progressivo,
        document.terzista,
        String(document.data),
        document.stato,
        document.piede,
        logoBuffer,
        hasLogo
      );
    }
    doc.moveTo(marginX, currentY).lineTo(marginX + usableWidth, currentY).stroke();
    // Bordi esterni più marcati e allineati
    doc
      .moveTo(marginX, articleSectionStartY)
      .lineTo(marginX, currentY)
      .stroke();
    doc
      .moveTo(marginX + usableWidth, articleSectionStartY)
      .lineTo(marginX + usableWidth, currentY)
      .stroke();
    doc.restore();
  }

  for (const [rif, mancanti] of Object.entries(mancantiGrouped)) {
    // Riga header "MANCANTI SU ..."
    if (currentY + rowHeight > pageHeight - 120) {
      currentY = handlePageBreak(
        doc,
        currentY,
        pageHeight,
        marginX,
        marginY,
        usableWidth,
        rowHeight,
        colArticolo,
        colDescrizione,
        colNomCom,
        colUM,
        colQta,
        colValore,
        progressivo,
        document.terzista,
        String(document.data),
        document.stato,
        document.piede,
        logoBuffer,
        hasLogo
      );
    }

    doc.lineWidth(0.4);
    doc.moveTo(marginX, currentY).lineTo(marginX, currentY + rowHeight).stroke();
    doc.moveTo(marginX + usableWidth, currentY).lineTo(marginX + usableWidth, currentY + rowHeight).stroke();

    doc.fontSize(8).fillColor('#000000').font('Helvetica-Bold');
    doc.text(`MANCANTI SU ${rif}`, marginX + colArticolo + 2, currentY + 3, {
      width: usableWidth - colArticolo - 4,
    });

    currentY += rowHeight;

    // Righe mancanti
    for (const riga of mancanti) {
      const codice = riga.article?.codiceArticolo || riga.codiceLibero || '';
      const descrizione = riga.article?.descrizione || riga.descrizioneLibera || '';
      const nomCom = riga.article?.voceDoganale || riga.voceLibera || '';
      const um = riga.article?.um || riga.umLibera || '';
      const qta = riga.qtaReale || riga.qtaOriginale;
      const prezzo = riga.article?.prezzoUnitario || riga.prezzoLibero || 0;
      const subtotal = Math.round(qta * Number(prezzo) * 100) / 100;
      totalValue += subtotal;

      if (currentY + rowHeight > pageHeight - 120) {
        currentY = handlePageBreak(
          doc,
          currentY,
          pageHeight,
          marginX,
          marginY,
          usableWidth,
          rowHeight,
          colArticolo,
          colDescrizione,
          colNomCom,
          colUM,
          colQta,
          colValore,
          progressivo,
          document.terzista,
          String(document.data),
          document.stato,
          document.piede,
          logoBuffer,
          hasLogo
        );
      }

      doc.fontSize(7).fillColor('#000000').font('Helvetica');

      doc.lineWidth(0.4);
      doc.moveTo(marginX, currentY).lineTo(marginX, currentY + rowHeight).stroke();
      doc.moveTo(marginX + colArticolo, currentY).lineTo(marginX + colArticolo, currentY + rowHeight).stroke();
      doc.moveTo(marginX + colArticolo + colDescrizione, currentY).lineTo(marginX + colArticolo + colDescrizione, currentY + rowHeight).stroke();
      doc.moveTo(marginX + colArticolo + colDescrizione + colNomCom, currentY).lineTo(marginX + colArticolo + colDescrizione + colNomCom, currentY + rowHeight).stroke();
      doc.moveTo(marginX + colArticolo + colDescrizione + colNomCom + colUM, currentY).lineTo(marginX + colArticolo + colDescrizione + colNomCom + colUM, currentY + rowHeight).stroke();
      doc.moveTo(marginX + colArticolo + colDescrizione + colNomCom + colUM + colQta, currentY).lineTo(marginX + colArticolo + colDescrizione + colNomCom + colUM + colQta, currentY + rowHeight).stroke();
      doc.moveTo(marginX + usableWidth, currentY).lineTo(marginX + usableWidth, currentY + rowHeight).stroke();

      doc.text(codice, marginX + 2, currentY + 3, {
        width: colArticolo - 4,
        lineBreak: false,
      });
      doc.text(descrizione, marginX + colArticolo + 2, currentY + 3, {
        width: colDescrizione - 4,
        lineBreak: false,
      });
      doc.text(nomCom, marginX + colArticolo + colDescrizione + 2, currentY + 3, {
        width: colNomCom - 4,
        lineBreak: false,
      });
      doc.text(um, marginX + colArticolo + colDescrizione + colNomCom + 2, currentY + 3, {
        width: colUM - 4,
        lineBreak: false,
      });
      doc.text(
        String(qta),
        marginX + colArticolo + colDescrizione + colNomCom + colUM + 2,
        currentY + 3,
        { width: colQta - 4, lineBreak: false }
      );
      doc.text(
        subtotal.toFixed(2).replace('.', ','),
        marginX + colArticolo + colDescrizione + colNomCom + colUM + colQta + 2,
        currentY + 3,
        { width: colValore - 4, lineBreak: false }
      );

      currentY += rowHeight;
    }
  }

  // Separatore finale sezione mancanti
  if (Object.keys(mancantiGrouped).length > 0) {
    doc.save();
    doc.lineWidth(1);
    if (currentY + 2 > pageHeight - 80) {
      currentY = handlePageBreak(
        doc,
        currentY,
        pageHeight,
        marginX,
        marginY,
        usableWidth,
        rowHeight,
        colArticolo,
        colDescrizione,
        colNomCom,
        colUM,
        colQta,
        colValore,
        progressivo,
        document.terzista,
        String(document.data),
        document.stato,
        document.piede,
        logoBuffer,
        hasLogo
      );
    }
    doc.moveTo(marginX, currentY).lineTo(marginX + usableWidth, currentY).stroke();
    doc
      .moveTo(marginX, mancantiSectionStartY)
      .lineTo(marginX, currentY)
      .stroke();
    doc
      .moveTo(marginX + usableWidth, mancantiSectionStartY)
      .lineTo(marginX + usableWidth, currentY)
      .stroke();
    doc.restore();
  }

  // Materiali mancanti dal documento (se presenti)
  if (document.mancanti && document.mancanti.length > 0) {
    const missingSectionStartY = currentY;

    // Riga vuota
    if (currentY + rowHeight > pageHeight - 120) {
      currentY = handlePageBreak(
        doc,
        currentY,
        pageHeight,
        marginX,
        marginY,
        usableWidth,
        rowHeight,
        colArticolo,
        colDescrizione,
        colNomCom,
        colUM,
        colQta,
        colValore,
        progressivo,
        document.terzista,
        String(document.data),
        document.stato,
        document.piede,
        logoBuffer,
        hasLogo
      );
    }
    doc.lineWidth(0.4);
    doc.moveTo(marginX, currentY).lineTo(marginX, currentY + rowHeight).stroke();
    doc.moveTo(marginX + usableWidth, currentY).lineTo(marginX + usableWidth, currentY + rowHeight).stroke();
    currentY += rowHeight;

    // Header "MATERIALI MANCANTI"
    if (currentY + rowHeight > pageHeight - 120) {
      currentY = handlePageBreak(
        doc,
        currentY,
        pageHeight,
        marginX,
        marginY,
        usableWidth,
        rowHeight,
        colArticolo,
        colDescrizione,
        colNomCom,
        colUM,
        colQta,
        colValore,
        progressivo,
        document.terzista,
        String(document.data),
        document.stato,
        document.piede,
        logoBuffer,
        hasLogo
      );
    }
    doc.lineWidth(0.4);
    doc.moveTo(marginX, currentY).lineTo(marginX, currentY + rowHeight).stroke();
    doc.moveTo(marginX + usableWidth, currentY).lineTo(marginX + usableWidth, currentY + rowHeight).stroke();

    doc.fontSize(8).fillColor('#000000').font('Helvetica-Bold');
    doc.text('MATERIALI MANCANTI', marginX + 2, currentY + 3, {
      width: usableWidth - 4,
    });
    currentY += rowHeight;

    for (const mancante of document.mancanti) {
      if (currentY + rowHeight > pageHeight - 120) {
        currentY = handlePageBreak(
          doc,
          currentY,
          pageHeight,
          marginX,
          marginY,
          usableWidth,
          rowHeight,
          colArticolo,
          colDescrizione,
          colNomCom,
          colUM,
          colQta,
          colValore,
          progressivo,
          document.terzista,
          String(document.data),
          document.stato,
          document.piede,
          logoBuffer,
          hasLogo
        );
      }

      doc.fontSize(7).fillColor('#000000').font('Helvetica');

      doc
        .moveTo(marginX, currentY)
        .lineTo(marginX, currentY + rowHeight)
        .stroke();
      doc
        .moveTo(marginX + colArticolo, currentY)
        .lineTo(marginX + colArticolo, currentY + rowHeight)
        .stroke();
      doc
        .moveTo(marginX + colArticolo + colDescrizione, currentY)
        .lineTo(marginX + colArticolo + colDescrizione, currentY + rowHeight)
        .stroke();
      doc
        .moveTo(marginX + colArticolo + colDescrizione + colNomCom, currentY)
        .lineTo(marginX + colArticolo + colDescrizione + colNomCom, currentY + rowHeight)
        .stroke();
      doc
        .moveTo(marginX + colArticolo + colDescrizione + colNomCom + colUM, currentY)
        .lineTo(
          marginX + colArticolo + colDescrizione + colNomCom + colUM,
          currentY + rowHeight
        )
        .stroke();
      doc
        .moveTo(marginX + colArticolo + colDescrizione + colNomCom + colUM + colQta, currentY)
        .lineTo(
          marginX + colArticolo + colDescrizione + colNomCom + colUM + colQta,
          currentY + rowHeight
        )
        .stroke();
      doc
        .moveTo(marginX + usableWidth, currentY)
        .lineTo(marginX + usableWidth, currentY + rowHeight)
        .stroke();

      doc.text(mancante.article?.codiceArticolo || '', marginX + 2, currentY + 3, {
        width: colArticolo - 4,
        lineBreak: false,
      });
      doc.text(mancante.article?.descrizione || '', marginX + colArticolo + 2, currentY + 3, {
        width: colDescrizione - 4,
        lineBreak: false,
      });
      doc.text('', marginX + colArticolo + colDescrizione + 2, currentY + 3, {
        width: colNomCom - 4,
        lineBreak: false,
      });
      doc.text('', marginX + colArticolo + colDescrizione + colNomCom + 2, currentY + 3, {
        width: colUM - 4,
        lineBreak: false,
      });
      doc.text(
        String(mancante.qtaMancante || 0),
        marginX + colArticolo + colDescrizione + colNomCom + colUM + 2,
        currentY + 3,
        { width: colQta - 4, lineBreak: false }
      );
      doc.text(
        '',
        marginX + colArticolo + colDescrizione + colNomCom + colUM + colQta + 2,
        currentY + 3,
        { width: colValore - 4, lineBreak: false }
      );

      currentY += rowHeight;
    }

    // Separatore e bordi laterali esterni sezione materiali mancanti
    if (currentY + 2 > pageHeight - 120) {
      currentY = handlePageBreak(
        doc, currentY, pageHeight, marginX, marginY, usableWidth, rowHeight,
        colArticolo, colDescrizione, colNomCom, colUM, colQta, colValore,
        document.progressivo, document.terzista, document.data.toISOString(), document.stato,
        document.piede, logoBuffer, hasLogo
      );
    }
    doc.save();
    doc.lineWidth(1);
    doc.moveTo(marginX, currentY).lineTo(marginX + usableWidth, currentY).stroke();
    doc.moveTo(marginX, missingSectionStartY).lineTo(marginX, currentY).stroke();
    doc.moveTo(marginX + usableWidth, missingSectionStartY).lineTo(marginX + usableWidth, currentY).stroke();
    doc.restore();
  }

  // Separatore finale materiali mancanti (document.mancanti)
  if (document.mancanti && document.mancanti.length > 0) {
    if (currentY + 2 > pageHeight - 120) {
      currentY = handlePageBreak(
        doc, currentY, pageHeight, marginX, marginY, usableWidth, rowHeight,
        colArticolo, colDescrizione, colNomCom, colUM, colQta, colValore,
        document.progressivo, document.terzista, document.data.toISOString(), document.stato,
        document.piede, logoBuffer, hasLogo
      );
    }
    doc.moveTo(marginX, currentY).lineTo(marginX + usableWidth, currentY).stroke();
  }

  // Riga vuota
  if (currentY + rowHeight > pageHeight - 120) {
    currentY = handlePageBreak(
      doc, currentY, pageHeight, marginX, marginY, usableWidth, rowHeight,
      colArticolo, colDescrizione, colNomCom, colUM, colQta, colValore,
      document.progressivo, document.terzista, document.data.toISOString(), document.stato,
      document.piede, logoBuffer, hasLogo
    );
  }
  doc
    .moveTo(marginX, currentY)
    .lineTo(marginX, currentY + rowHeight)
    .stroke();
  doc
    .moveTo(marginX + usableWidth, currentY)
    .lineTo(marginX + usableWidth, currentY + rowHeight)
    .stroke();
  currentY += rowHeight;

  // ========== RIEPILOGO PESI ==========
  if (currentY + rowHeight > pageHeight - 120) {
    currentY = handlePageBreak(
      doc, currentY, pageHeight, marginX, marginY, usableWidth, rowHeight,
      colArticolo, colDescrizione, colNomCom, colUM, colQta, colValore,
      document.progressivo, document.terzista, document.data.toISOString(), document.stato,
      document.piede, logoBuffer, hasLogo
    );
  }

  doc
    .moveTo(marginX, currentY)
    .lineTo(marginX, currentY + rowHeight)
    .stroke();
  doc
    .moveTo(marginX + usableWidth, currentY)
    .lineTo(marginX + usableWidth, currentY + rowHeight)
    .stroke();

  doc.fontSize(9).fillColor('#000000').font('Helvetica-Bold');
  doc.text('RIEPILOGO PESI', marginX + 2, currentY + 3, {
    width: usableWidth - 4,
    align: 'center',
  });
  currentY += rowHeight;

  // Voci doganali (da piede)
  if (document.piede && document.piede.vociDoganali) {
    const voci = [...(document.piede.vociDoganali as Array<{ voce: string; peso: number }>)]?.sort(
      (a, b) => (a.voce || '').localeCompare(b.voce || '', undefined, { numeric: true })
    );
    const vociCount = voci.filter((v) => v.voce && v.peso).length;

    for (let i = 0; i < voci.length; i++) {
      const voceData = voci[i];
      if (!voceData.voce || !voceData.peso) continue;

      if (currentY + rowHeight > pageHeight - 120) {
        currentY = handlePageBreak(
          doc, currentY, pageHeight, marginX, marginY, usableWidth, rowHeight,
          colArticolo, colDescrizione, colNomCom, colUM, colQta, colValore,
          document.progressivo, document.terzista, document.data.toISOString(), document.stato,
          document.piede, logoBuffer, hasLogo
        );
      }

      const colVoce1 = usableWidth * 0.1;
      const colVoce2 = usableWidth * 0.5;
      const colVoce3 = usableWidth * 0.1;
      const colVoce4 = usableWidth * 0.3;

      doc
        .moveTo(marginX, currentY)
        .lineTo(marginX, currentY + rowHeight)
        .stroke();
      doc
        .moveTo(marginX + colVoce1, currentY)
        .lineTo(marginX + colVoce1, currentY + rowHeight)
        .stroke();
      doc
        .moveTo(marginX + colVoce1 + colVoce2, currentY)
        .lineTo(marginX + colVoce1 + colVoce2, currentY + rowHeight)
        .stroke();
      doc
        .moveTo(marginX + colVoce1 + colVoce2 + colVoce3, currentY)
        .lineTo(marginX + colVoce1 + colVoce2 + colVoce3, currentY + rowHeight)
        .stroke();
      doc
        .moveTo(marginX + usableWidth, currentY)
        .lineTo(marginX + usableWidth, currentY + rowHeight)
        .stroke();

      doc.fontSize(7).fillColor('#000000').font('Helvetica');

      // Prima cella vuota
      doc.text('', marginX + 2, currentY + 3, { width: colVoce1 - 4 });

      // Seconda cella: testo voce
      const voceTesto =
        voceData.voce === 'SOTTOPIEDI'
          ? 'SOTTOPIEDI N.C. 56031480 PESO NETTO KG.'
          : `N.C. ${voceData.voce} PESO NETTO KG.`;

      doc.text(voceTesto, marginX + colVoce1 + 2, currentY + 3, {
        width: colVoce2 - 4,
        align: 'right',
      });

      // Terza cella: peso
      doc.text(String(voceData.peso), marginX + colVoce1 + colVoce2 + 2, currentY + 3, {
        width: colVoce3 - 4,
      });

      // Quarta cella: box totali (solo prima riga con rowspan)
      if (i === 0) {
        // Altezza minima garantita di 7 righe anche se c'è una sola voce
        const minRows = 7;
        const actualRows = Math.max(vociCount, minRows);
        const totBoxHeight = actualRows * rowHeight;
        doc.rect(marginX + colVoce1 + colVoce2 + colVoce3, currentY, colVoce4, totBoxHeight).stroke();

        doc.fontSize(8).fillColor('#000000').font('Helvetica-Bold');
        let totY = currentY + totBoxHeight / 2 - 20;
        doc.text(
          `TOT. COLLI ${document.piede?.nColli || 0} ${document.piede?.aspettoColli || ''}`,
          marginX + colVoce1 + colVoce2 + colVoce3 + 2,
          totY,
          { width: colVoce4 - 4, align: 'center' }
        );
        totY += 25;
        doc.fontSize(7).font('Helvetica');
        doc.text(
          `Tot. Peso Lordo kg. ${document.piede?.totPesoLordo || 0}`,
          marginX + colVoce1 + colVoce2 + colVoce3 + 2,
          totY,
          { width: colVoce4 - 4, align: 'center' }
        );
        totY += 12;
        doc.text(
          `Tot. Peso Netto kg. ${document.piede?.totPesoNetto || 0}`,
          marginX + colVoce1 + colVoce2 + colVoce3 + 2,
          totY,
          { width: colVoce4 - 4, align: 'center' }
        );
      }

      currentY += rowHeight;
    }

    // Aggiungi righe vuote se ci sono meno del minimo (7 righe)
    const minRows = 7;
    const emptyRowsNeeded = Math.max(0, minRows - vociCount);

    for (let j = 0; j < emptyRowsNeeded; j++) {
      const colVoce1 = usableWidth * 0.1;
      const colVoce2 = usableWidth * 0.5;
      const colVoce3 = usableWidth * 0.1;

      // Bordi laterali per righe vuote
      doc
        .moveTo(marginX, currentY)
        .lineTo(marginX, currentY + rowHeight)
        .stroke();
      doc
        .moveTo(marginX + colVoce1, currentY)
        .lineTo(marginX + colVoce1, currentY + rowHeight)
        .stroke();
      doc
        .moveTo(marginX + colVoce1 + colVoce2, currentY)
        .lineTo(marginX + colVoce1 + colVoce2, currentY + rowHeight)
        .stroke();
      doc
        .moveTo(marginX + colVoce1 + colVoce2 + colVoce3, currentY)
        .lineTo(marginX + colVoce1 + colVoce2 + colVoce3, currentY + rowHeight)
        .stroke();
      doc
        .moveTo(marginX + usableWidth, currentY)
        .lineTo(marginX + usableWidth, currentY + rowHeight)
        .stroke();

      currentY += rowHeight;
    }
  }

  // ========== LANCI E AUTORIZZAZIONE ==========
  if (currentY + rowHeight * 2 > pageHeight - 120) {
    currentY = handlePageBreak(
      doc, currentY, pageHeight, marginX, marginY, usableWidth, rowHeight,
      colArticolo, colDescrizione, colNomCom, colUM, colQta, colValore,
      document.progressivo, document.terzista, document.data.toISOString(), document.stato,
      document.piede, logoBuffer, hasLogo
    );
  }

  // Lanci
  let lanciHeight = rowHeight;
  if (document.lanci && document.lanci.length > 0) {
    lanciHeight = rowHeight * (document.lanci.length + 1);
  }

  doc.rect(marginX, currentY, usableWidth, lanciHeight).stroke();

  let lanciY = currentY + 5;
  if (document.piede?.consegnatoPer) {
    doc.fontSize(8).fillColor('#000000').font('Helvetica-Bold');
    doc.text(
      `Materiale consegnato per la realizzazione di ${document.piede.consegnatoPer}:`,
      marginX + 5,
      lanciY,
      { width: usableWidth - 10 }
    );
    lanciY += 15;
  }

  if (document.lanci && document.lanci.length > 0) {
    doc.fontSize(7).fillColor('#000000').font('Helvetica');
    for (const lancio of document.lanci) {
      doc.text(
        `• # ${lancio.lancio} | Articolo: ${lancio.articolo} | Paia: ${lancio.paia}`,
        marginX + 10,
        lanciY,
        { width: usableWidth - 15 }
      );
      lanciY += 12;
    }
  }

  currentY += lanciHeight;

  // Autorizzazione
  if (currentY + rowHeight > pageHeight - 120) {
    currentY = handlePageBreak(
      doc, currentY, pageHeight, marginX, marginY, usableWidth, rowHeight,
      colArticolo, colDescrizione, colNomCom, colUM, colQta, colValore,
      document.progressivo, document.terzista, document.data.toISOString(), document.stato,
      document.piede, logoBuffer, hasLogo
    );
  }

  doc.rect(marginX, currentY, usableWidth, rowHeight).stroke();
  doc.fontSize(7).fillColor('#000000').font('Helvetica');
  doc.text(document.autorizzazione || '', marginX + 5, currentY + 3, {
    width: usableWidth - 10,
  });
  currentY += rowHeight;

  // ========== TOTALE ==========
  if (currentY + rowHeight > pageHeight - 120) {
    currentY = handlePageBreak(
      doc, currentY, pageHeight, marginX, marginY, usableWidth, rowHeight,
      colArticolo, colDescrizione, colNomCom, colUM, colQta, colValore,
      document.progressivo, document.terzista, document.data.toISOString(), document.stato,
      document.piede, logoBuffer, hasLogo
    );
  }

  doc.rect(marginX, currentY, usableWidth, rowHeight).fillAndStroke('#e0e0e0', '#000000');

  doc.fontSize(9).fillColor('#000000').font('Helvetica-Bold');
  doc.text('Valore totale in €:', marginX + 2, currentY + 4, {
    width: usableWidth - colValore - 4,
    align: 'right',
  });
  doc.text(
    totalValue.toFixed(2).replace('.', ','),
    marginX + usableWidth - colValore + 2,
    currentY + 4,
    { width: colValore - 4 }
  );
  currentY += rowHeight;

  // Spazio riempitivo per spingere commento/firma verso il fondo pagina
  const footerHeight = 80;
  const footerStartTarget = pageHeight - marginY - footerHeight;
  if (currentY < footerStartTarget) {
    // Stampa autorizzazione terzista se presente nel riempitivo
    if (document.terzista?.autorizzazione) {
      doc.fontSize(8).fillColor('#000000').font('Helvetica-Bold');
      doc.text(document.terzista.autorizzazione, marginX, currentY + 5, {
        width: usableWidth,
        align: 'center',
      });
      currentY += 18;
    }
    // allunga i bordi laterali per arrivare al footer
    doc.moveTo(marginX, currentY).lineTo(marginX, footerStartTarget).stroke();
    doc
      .moveTo(marginX + usableWidth, currentY)
      .lineTo(marginX + usableWidth, footerStartTarget)
      .stroke();
    currentY = footerStartTarget;
  }

  // ========== COMMENTO E FIRMA ==========
  if (currentY + footerHeight > pageHeight - marginY) {
    doc.addPage();
    currentY = marginY + 20;
  }

  doc.rect(marginX, currentY, usableWidth, footerHeight).stroke();

  // Commento (sinistra)
  if (document.commento) {
    doc.fontSize(9).fillColor('#000000').font('Helvetica-Bold');
    doc.text(document.commento, marginX + 5, currentY + 5, {
      width: usableWidth * 0.55,
    });
  }

  // Firma (destra)
  const sigX = marginX + usableWidth * 0.6;
  const sigY = currentY + footerHeight - 35;

  doc
    .moveTo(sigX, sigY)
    .lineTo(sigX + 150, sigY)
    .stroke();

  doc.fontSize(7).fillColor('#000000').font('Helvetica');
  doc.text('Firma per accettazione', sigX, sigY + 5, {
    width: 150,
    align: 'center',
  });

  // Numerazione pagine (Pagina X di Y) nella colonna dedicata dell'intestazione
  const pageRange = doc.bufferedPageRange();
  const headerInfoTableY = marginY + tableLogoHeight + 15 + 30; // punto di partenza tabella info
  const headerInfoRowHeight = 20;
  const hCol1W = usableWidth * 0.22;
  const hCol2W = usableWidth * 0.22;
  const hCol3W = usableWidth * 0.14;
  const hCol4W = usableWidth * 0.14;
  const hCol5W = usableWidth * 0.14;
  const hCol6W = usableWidth * 0.14;

  for (let i = 0; i < pageRange.count; i++) {
    doc.switchToPage(pageRange.start + i);
    doc.fontSize(7).fillColor('#000000').font('Helvetica');
    doc.text(
      `Pagina ${i + 1} di ${pageRange.count}`,
      marginX + hCol1W + hCol2W + hCol3W + hCol4W + hCol5W + 2,
      headerInfoTableY + headerInfoRowHeight + 6,
      {
        width: hCol6W - 4,
        align: 'left',
      }
    );
  }

  await waitForPdf(doc, fullPath);
  const stat = fs.statSync(fullPath);

  return {
    outputPath: fullPath,
    outputName: fileName,
    outputMime: 'application/pdf',
    outputSize: Number(stat.size),
  };
};

export default handler;
