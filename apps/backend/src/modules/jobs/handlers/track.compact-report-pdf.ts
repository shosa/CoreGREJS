import PDFDocument = require('pdfkit');
import { JobHandler } from '../types';
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { getCompanyInfo } from './company-info.helper';

const prisma = new PrismaClient();

// A4 landscape: 841.89 × 595.28 pt, margin 30
// Courier 8pt → char width ≈ 4.8pt → usable width ~782pt → ~163 chars

const LINE_WIDTH = 140;
const SEP_EQUAL = '='.repeat(LINE_WIDTH);
const SEP_DASH  = '-'.repeat(LINE_WIDTH);
const SEP_DOT   = '.'.repeat(LINE_WIDTH);

const FONT    = 'Courier';
const FONT_B  = 'Courier-Bold';
const FONT_SZ = 8;
const MARGIN  = 30;
const LINE_H  = FONT_SZ * 1.4;
const PAGE_H  = 595.28; // landscape height
const BOTTOM  = PAGE_H - MARGIN - LINE_H * 2;

// Colonne principali (totale ~140)
const COL = {
  cartel:    10,
  commessa:  12,
  ragSoc:    25,
  articolo:  18,
  tipo:      22,
  lotto:     25,
  ddt:       14,
  data:      10,
};

const HEADER_ROW =
  'CARTEL'.padEnd(COL.cartel) +
  'COMMESSA'.padEnd(COL.commessa) +
  'CLIENTE'.padEnd(COL.ragSoc) +
  'ARTICOLO'.padEnd(COL.articolo) +
  'TIPO MATERIALE'.padEnd(COL.tipo) +
  'LOTTO'.padEnd(COL.lotto) +
  'DDT'.padEnd(COL.ddt) +
  'DATA';

function pad(s: string | null | undefined, len: number): string {
  if (!s) return ''.padEnd(len);
  return s.slice(0, len).padEnd(len);
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function fmtDateTime(d: Date): string {
  return d.toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const handler: JobHandler = async (payload, helpers) => {
  const { dataDa, dataA, userId, jobId } = payload as {
    dataDa: string; dataA: string; userId: number; jobId: string;
  };

  const { trackingService, ensureOutputPath, waitForPdf } = helpers;

  const dataDaObj = new Date(dataDa);
  const dataAObj  = new Date(dataA);

  const [rows, company] = await Promise.all([
    trackingService.getCompactReportData(dataDaObj, dataAObj),
    getCompanyInfo(prisma),
  ]);

  const dataDaStr = dataDaObj.toLocaleDateString('it-IT');
  const dataAStr  = dataAObj.toLocaleDateString('it-IT');
  const fileName  = `MASTRINO TRACKING ${dataDa}_${dataA}.pdf`;
  const { fullPath } = await ensureOutputPath(userId, jobId, fileName);

  const doc = new PDFDocument({ margin: MARGIN, size: 'A4', layout: 'landscape' });

  const writeLine = (text: string, bold = false) => {
    doc.font(bold ? FONT_B : FONT).fontSize(FONT_SZ).text(text, { lineBreak: true, lineGap: 0 });
  };

  const checkPage = () => {
    if (doc.y + LINE_H * 4 > BOTTOM) {
      doc.addPage();
      writeLine(SEP_EQUAL);
      writeLine(HEADER_ROW, true);
      writeLine(SEP_DASH);
    }
  };

  const centerStr = (s: string) => {
    const spaces = Math.max(0, Math.floor((LINE_WIDTH - s.length) / 2));
    return ' '.repeat(spaces) + s;
  };

  // ── INTESTAZIONE ──
  writeLine(SEP_EQUAL, true);
  writeLine(centerStr('MASTRINO STORICO COLLEGAMENTI TRACKING'), true);
  writeLine(centerStr(`Dal ${dataDaStr} al ${dataAStr}`));
  writeLine(SEP_EQUAL, true);
  writeLine('');
  writeLine(`Azienda : ${company.nomeAzienda}   P.IVA: ${company.partitaIva || '-'}`);
  writeLine(`Stampato: ${fmtDateTime(new Date())}   Totale righe: ${rows.length.toLocaleString('it-IT')}`);
  writeLine(SEP_EQUAL, true);
  writeLine('');

  if (rows.length === 0) {
    writeLine(centerStr('[ Nessun record archiviato nel periodo selezionato ]'));
    writeLine('');
    writeLine(SEP_EQUAL, true);
    await waitForPdf(doc, fullPath);
    const stat = fs.statSync(fullPath);
    return { outputPath: fullPath, outputName: fileName, outputMime: 'application/pdf', outputSize: Number(stat.size) };
  }

  // ── HEADER COLONNE ──
  writeLine(HEADER_ROW, true);
  writeLine(SEP_DASH);

  let lastCartel: number | null = null;

  for (const row of rows) {
    checkPage();

    if (lastCartel !== null && lastCartel !== row.cartel) {
      writeLine(SEP_DOT);
    }
    lastCartel = row.cartel;

    const line =
      pad(String(row.cartel), COL.cartel) +
      pad(row.commessa,        COL.commessa) +
      pad(row.ragioneSoc,      COL.ragSoc) +
      pad(row.articolo,        COL.articolo) +
      pad(row.typeName,        COL.tipo) +
      pad(row.lot,             COL.lotto) +
      pad(row.lotDoc,          COL.ddt) +
      fmtDate(row.timestamp);

    writeLine(line);

    // Riga secondaria: descrizione articolo + SKU + data DDT lotto (se presenti)
    const hasExtra = row.descrizione || row.sku || row.lotDate;
    if (hasExtra) {
      const indent = ' '.repeat(COL.cartel + COL.commessa);
      const extra =
        indent +
        pad(`[${row.descrizione || ''}]`, COL.ragSoc + COL.articolo) +
        (row.sku     ? `SKU:${row.sku} `.padEnd(COL.tipo)             : ''.padEnd(COL.tipo)) +
        ''.padEnd(COL.lotto) +
        (row.lotDate ? `DDT dt: ${fmtDate(row.lotDate)}` : '');
      writeLine(extra);
    }
  }

  // ── FOOTER ──
  writeLine('');
  writeLine(SEP_EQUAL, true);
  writeLine(centerStr(`** FINE DOCUMENTO - ${rows.length.toLocaleString('it-IT')} RIGHE **`), true);
  writeLine(SEP_EQUAL, true);

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
