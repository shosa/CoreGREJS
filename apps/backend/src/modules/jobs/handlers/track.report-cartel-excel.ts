import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import { JobHandler } from '../types';

const handler: JobHandler = async (payload, helpers) => {
  const { cartelli = [], userId, jobId } = payload as { cartelli: number[]; userId: number; jobId: string };
  const { trackingService, ensureOutputPath } = helpers;

  const { groupedByCartel, allTypeNames } = await trackingService.getReportDataByCartellini(cartelli);
  const fileName = `TRACKING LIST CARTELLINI ${new Date().toISOString().split('T')[0]}.xlsx`;
  const { fullPath } = await ensureOutputPath(userId, jobId, fileName);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CoreGRE';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Packing List Cartellini');
  const fixedHeaders = ['Cartellino', 'Data Inserimento', 'Riferimento Originale', 'Codice Articolo', 'Paia'];
  const allHeaders = [...fixedHeaders, ...allTypeNames];

  allHeaders.forEach((header, idx) => {
    sheet.getCell(1, idx + 1).value = header;
  });

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFCCCCCC' },
  };

  groupedByCartel.forEach((item, rowIdx) => {
    const row = rowIdx + 2;
    sheet.getCell(row, 1).value = item.cartel;
    sheet.getCell(row, 2).value = item.dataInserimento || '';
    sheet.getCell(row, 3).value = item.riferimentoOriginale || '';
    sheet.getCell(row, 4).value = item.codiceArticolo || '';
    sheet.getCell(row, 5).value = item.paia || 0;

    allTypeNames.forEach((typeName, typeIdx) => {
      const lots = item.types[typeName] || [];
      sheet.getCell(row, 6 + typeIdx).value = lots.join(', ');
    });
  });

  sheet.columns.forEach((col, idx) => {
    col.width = idx < 5 ? [12, 15, 20, 15, 8][idx] : 20;
  });

  await workbook.xlsx.writeFile(fullPath);
  const stat = fs.statSync(fullPath);
  return { outputPath: fullPath, outputName: fileName, outputMime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', outputSize: Number(stat.size) };
};

export default handler;
