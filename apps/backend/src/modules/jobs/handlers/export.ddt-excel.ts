import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import { JobHandler } from '../types';

const handler: JobHandler = async (payload, helpers) => {
  const { progressivo, userId, jobId } = payload as {
    progressivo: string;
    userId: number;
    jobId: string;
  };
  const { exportService, ensureOutputPath } = helpers;

  const document = await exportService.getDocumentByProgressivo(progressivo);
  if (!document) {
    throw new Error(`Documento ${progressivo} non trovato`);
  }

  const fileName = `ddt_${progressivo}.xlsx`;
  const { fullPath } = await ensureOutputPath(userId, jobId, fileName);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CoreGRE';
  workbook.created = new Date();

  const materialsSheet = workbook.addWorksheet('Materiali');
  const mancantiSheet = workbook.addWorksheet('Mancanti');

  // Headers essenziali
  const materialHeaders = ['Codice', 'Descrizione', 'Voce', 'UM', 'Qta', 'Prezzo', 'Totale'];
  materialsSheet.addRow(materialHeaders);
  materialsSheet.getRow(1).font = { bold: true };

  // Ordina righe per voce doganale
  const righeOrdinate = [...document.righe].filter((r: any) => !r.isMancante && (r.qtaReale || r.qtaOriginale) > 0);
  righeOrdinate.sort((a: any, b: any) => {
    const voceA = a.article?.voceDoganale || a.voceLibera || '';
    const voceB = b.article?.voceDoganale || b.voceLibera || '';
    return voceA.localeCompare(voceB, undefined, { numeric: true });
  });

  righeOrdinate.forEach((riga: any) => {
    const codice = riga.article?.codiceArticolo || riga.codiceLibero || '';
    const descrizione = riga.article?.descrizione || riga.descrizioneLibera || '';
    const voce = riga.article?.voceDoganale || riga.voceLibera || '';
    const um = riga.article?.um || riga.umLibera || '';
    const qta = Number(riga.qtaReale || riga.qtaOriginale || 0);
    const prezzo = Number(riga.article?.prezzoUnitario ?? riga.prezzoLibero ?? 0);
    const totale = qta * prezzo;
    materialsSheet.addRow([codice, descrizione, voce, um, qta, prezzo, totale]);
  });

  materialsSheet.columns.forEach((col, idx) => {
    if (!col) return;
    col.width = [18, 45, 15, 8, 10, 12, 12][idx] || 15;
    if (idx >= 4) {
      col.numFmt = '#,##0.00';
    }
  });

  // Mancanti
  mancantiSheet.addRow(['Codice', 'Qta Mancante']);
  mancantiSheet.getRow(1).font = { bold: true };

  // Mancanti da tab dedicato oppure ricavati da righe con flag isMancante
  const mancantiData =
    (document.mancanti && document.mancanti.length > 0
      ? [...document.mancanti]
      : document.righe?.filter((r: any) => r.isMancante)) || [];

  const mancanti = mancantiData.sort((a: any, b: any) =>
    (a.codiceArticolo || '').localeCompare(b.codiceArticolo || '', undefined, { numeric: true })
  );
  mancanti.forEach((mancante: any) => {
    mancantiSheet.addRow([mancante.codiceArticolo || '', Number(mancante.qtaMancante || 0)]);
  });
  mancantiSheet.columns.forEach((col, idx) => {
    if (!col) return;
    col.width = [18, 14][idx] || 15;
    if (idx === 1) col.numFmt = '#,##0.00';
  });

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
