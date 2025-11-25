import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

export interface ProcessedExcelData {
  success: boolean;
  modello?: string;
  lancio?: string;
  qty?: string;
  headers?: string[];
  rows?: {
    taglio: string[][];
    orlatura: string[][];
  };
  error?: string;
}

@Injectable()
export class ExcelProcessorService {
  private tempDir: string;
  private srcDir: string;

  constructor() {
    // Storage directories
    this.tempDir = path.join(process.cwd(), 'storage', 'export', 'temp');
    this.srcDir = path.join(process.cwd(), 'storage', 'export', 'src');

    // Ensure directories exist
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    if (!fs.existsSync(this.srcDir)) {
      fs.mkdirSync(this.srcDir, { recursive: true });
    }
  }

  /**
   * Process Excel file and extract TAGLIO and ORLATURA data
   * Logic ported from Legacy ExcelProcessor.php
   */
  async processExcelFile(
    fileName: string,
    progressivo?: string,
  ): Promise<ProcessedExcelData> {
    let filePath = path.join(this.tempDir, fileName);

    // If file not in temp and we have progressivo, check src
    if (!fs.existsSync(filePath) && progressivo) {
      const srcPath = path.join(this.srcDir, progressivo, fileName);
      if (fs.existsSync(srcPath)) {
        filePath = srcPath;
      }
    }

    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        error: `File non trovato: ${fileName}`,
      };
    }

    try {
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

      const rows: { taglio: string[][]; orlatura: string[][] } = {
        taglio: [],
        orlatura: [],
      };

      let isTaglio = false;
      let isOrlatura = false;
      let modello = '';

      // Extract modello from B1 (row 1, col B)
      const modelloCell = worksheet['B1'];
      if (modelloCell) {
        modello = this.sanitizeText(modelloCell.v);
      }

      // Process rows starting from row 2
      for (let rowNum = 1; rowNum <= range.e.r; rowNum++) {
        const rowData: string[] = [];

        // Read first 5 columns (A-E)
        for (let colNum = 0; colNum < 5; colNum++) {
          const cellAddress = XLSX.utils.encode_cell({
            r: rowNum,
            c: colNum,
          });
          const cell = worksheet[cellAddress];
          rowData.push(cell ? this.sanitizeText(cell.v) : '');
        }

        // Check for section markers
        if (rowData[0] === '02 - 1 TAGLIO') {
          isTaglio = true;
          isOrlatura = false;
          continue;
        }

        if (rowData[0] === '04 - 1 ORLATURA') {
          isOrlatura = true;
          isTaglio = false;
          continue;
        }

        // Check if row contains MONTAGGIO (stop processing)
        const containsMontaggio = rowData.some((cell) => {
          const cellValue = this.sanitizeText(cell);
          return (
            cellValue.includes('06 - 1 MONTAGGIO') ||
            cellValue.includes('06 - MONTAGGIO') ||
            cellValue.includes('06-1 MONTAGGIO') ||
            cellValue.includes('06-MONTAGGIO')
          );
        });

        if (containsMontaggio) {
          break;
        }

        // Process data rows
        const colonnaA = rowData[0].trim();
        const colonnaB = rowData[1].trim();

        if (!colonnaA) {
          if (colonnaB) {
            rowData[0] = 'ALTRO';
          } else {
            continue;
          }
        }

        // Check if row has content
        const hasContent = rowData.some((cell) => cell.trim() !== '');

        if (hasContent) {
          if (isTaglio && !isOrlatura) {
            rows.taglio.push(rowData);
          }

          if (isOrlatura) {
            rows.orlatura.push(rowData);
          }
        }
      }

      // Extract headers from row 6 (index 5)
      const headers: string[] = [];
      for (let colNum = 0; colNum < 5; colNum++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 5, c: colNum });
        const cell = worksheet[cellAddress];
        headers.push(cell ? this.sanitizeText(cell.v) : `Colonna ${colNum + 1}`);
      }

      // Extract lancio and qty from B2 and B3
      let lancio = '';
      let qty = '';
      try {
        const lancioCell = worksheet['B2'];
        const qtyCell = worksheet['B3'];
        lancio = lancioCell ? String(lancioCell.v) : '';
        qty = qtyCell ? String(qtyCell.v) : '';
      } catch (err) {
        // Ignore errors
      }

      return {
        success: true,
        modello,
        lancio,
        qty,
        headers,
        rows,
      };
    } catch (error) {
      return {
        success: false,
        error: `Errore nel processamento del file: ${error.message}`,
      };
    }
  }

  /**
   * Save uploaded file to temp directory
   */
  async saveUploadedFile(
    file: Express.Multer.File,
    progressivo?: string,
  ): Promise<string> {
    const targetDir = progressivo
      ? path.join(this.srcDir, progressivo)
      : this.tempDir;

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const fileName = `${Date.now()}_${file.originalname}`;
    const filePath = path.join(targetDir, fileName);

    fs.writeFileSync(filePath, file.buffer);

    return fileName;
  }

  /**
   * Get list of uploaded files for a document
   */
  async getUploadedFiles(progressivo: string): Promise<
    Array<{
      name: string;
      lancio: string;
      qty: string;
      uploadedAt: Date;
    }>
  > {
    const docDir = path.join(this.srcDir, progressivo);

    if (!fs.existsSync(docDir)) {
      return [];
    }

    const files = fs
      .readdirSync(docDir)
      .filter((f) => f.endsWith('.xlsx') || f.endsWith('.xls'));

    const result = [];
    for (const fileName of files) {
      const filePath = path.join(docDir, fileName);
      const stats = fs.statSync(filePath);

      // Extract lancio and qty from file
      try {
        const workbook = XLSX.readFile(filePath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        const lancioCell = worksheet['B2'];
        const qtyCell = worksheet['B3'];

        result.push({
          name: fileName,
          lancio: lancioCell ? String(lancioCell.v) : 'N/A',
          qty: qtyCell ? String(qtyCell.v) : 'N/A',
          uploadedAt: stats.mtime,
        });
      } catch (err) {
        result.push({
          name: fileName,
          lancio: 'N/A',
          qty: 'N/A',
          uploadedAt: stats.mtime,
        });
      }
    }

    return result.sort(
      (a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime(),
    );
  }

  /**
   * Delete uploaded file
   */
  async deleteUploadedFile(
    progressivo: string,
    fileName: string,
  ): Promise<void> {
    const filePath = path.join(this.srcDir, progressivo, fileName);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  /**
   * Move files from temp to document src directory
   */
  async moveTempFilesToSrc(progressivo: string): Promise<void> {
    const targetDir = path.join(this.srcDir, progressivo);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const tempFiles = fs
      .readdirSync(this.tempDir)
      .filter((f) => f.endsWith('.xlsx') || f.endsWith('.xls'));

    for (const fileName of tempFiles) {
      const srcPath = path.join(this.tempDir, fileName);
      const destPath = path.join(targetDir, fileName);

      fs.renameSync(srcPath, destPath);
    }
  }

  /**
   * Sanitize text from Excel cells (Legacy logic)
   */
  private sanitizeText(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    let text = String(value);

    // Remove special characters
    text = text.replace(/[\x00-\x1F\x7F]/g, '');

    // Trim whitespace
    text = text.trim();

    return text;
  }
}
