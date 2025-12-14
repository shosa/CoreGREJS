import { Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

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
  private readonly logger = new Logger(ExcelProcessorService.name);
  private tempDir: string;
  private srcDir: string;

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {
    // Storage directories
    this.tempDir = path.join(process.cwd(), 'storage', 'export', 'temp');
    this.srcDir = path.join(process.cwd(), 'storage', 'export', 'src');

    // Ensure directories exist (with error handling for Docker volumes)
    try {
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }
      if (!fs.existsSync(this.srcDir)) {
        fs.mkdirSync(this.srcDir, { recursive: true });
      }
    } catch (error) {
      // Log warning but don't crash - directories might be mounted as volumes
      console.warn('⚠️  Could not create storage directories (might already exist as mounted volumes):', error.message);
      console.warn('   If running in Docker, ensure volumes are properly initialized.');
    }
  }

  /**
   * Process Excel file and extract TAGLIO and ORLATURA data
   * Logic ported from Legacy ExcelProcessor.php
   * Now reads from MinIO if progressivo is provided
   */
  async processExcelFile(
    fileName: string,
    progressivo?: string,
  ): Promise<ProcessedExcelData> {
    let workbook: any;

    try {
      // Try temp directory first
      const tempPath = path.join(this.tempDir, fileName);

      if (fs.existsSync(tempPath)) {
        // Read from temp directory
        workbook = XLSX.readFile(tempPath);
      } else if (progressivo) {
        // Read from MinIO
        const objectName = `export/${progressivo}/${fileName}`;
        const buffer = await this.storageService.getFileBuffer(objectName);
        workbook = XLSX.read(buffer, { type: 'buffer' });
      } else {
        return {
          success: false,
          error: `File non trovato: ${fileName}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `File non trovato o non leggibile: ${fileName}`,
      };
    }

    try {
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
   * Save uploaded file to MinIO (if progressivo) or temp directory
   */
  async saveUploadedFile(
    file: Express.Multer.File,
    progressivo?: string,
  ): Promise<string> {
    const fileName = `${Date.now()}_${file.originalname}`;

    if (progressivo) {
      // Upload directly to MinIO
      const objectName = `export/${progressivo}/${fileName}`;
      await this.storageService.uploadBuffer(objectName, file.buffer, {
        'Content-Type': file.mimetype,
        'original-name': file.originalname,
      });
      this.logger.log(`File uploaded to MinIO: ${objectName}`);
    } else {
      // Save to temp directory (for temp uploads without document)
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }
      const filePath = path.join(this.tempDir, fileName);
      fs.writeFileSync(filePath, file.buffer);
    }

    return fileName;
  }

  /**
   * Get list of uploaded files for a document from MinIO
   */
  async getUploadedFiles(progressivo: string): Promise<
    Array<{
      name: string;
      lancio: string;
      qty: string;
      uploadedAt: Date;
      processed: boolean;
    }>
  > {
    try {
      // List files from MinIO
      const prefix = `export/${progressivo}/`;
      const objectNames = await this.storageService.listFiles(prefix);

      const excelFiles = objectNames.filter((f) => f.endsWith('.xlsx') || f.endsWith('.xls'));

      if (excelFiles.length === 0) {
        return [];
      }

      const result = [];
      for (const objectName of excelFiles) {
        const fileName = path.basename(objectName);

        // Get file metadata for upload date
        const metadata = await this.storageService.getFileMetadata(objectName);

        // Extract lancio and qty from file
        try {
          const buffer = await this.storageService.getFileBuffer(objectName);
          const workbook = XLSX.read(buffer, { type: 'buffer' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];

          const articoloCell = worksheet['B1'];
          const lancioCell = worksheet['B2'];
          const qtyCell = worksheet['B3'];

          // File is processed if it has the structure: ARTICOLO:, LANCIO:, PAIA DA PRODURRE:
          const isProcessed = articoloCell && lancioCell && qtyCell &&
                             String(worksheet['A1']?.v || '').includes('ARTICOLO') &&
                             String(worksheet['A2']?.v || '').includes('LANCIO');

          result.push({
            name: fileName,
            lancio: lancioCell ? String(lancioCell.v) : 'N/A',
            qty: qtyCell ? String(qtyCell.v) : 'N/A',
            uploadedAt: metadata.lastModified,
            processed: isProcessed,
          });
        } catch (err) {
          result.push({
            name: fileName,
            lancio: 'N/A',
            qty: 'N/A',
            uploadedAt: metadata.lastModified,
            processed: false,
          });
        }
      }

      return result.sort(
        (a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime(),
      );
    } catch (error) {
      this.logger.error(`Failed to get uploaded files for ${progressivo}: ${error.message}`);
      return [];
    }
  }

  /**
   * Delete uploaded file from MinIO
   */
  async deleteUploadedFile(
    progressivo: string,
    fileName: string,
  ): Promise<void> {
    const objectName = `export/${progressivo}/${fileName}`;
    await this.storageService.deleteFile(objectName);
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
   * Save processed Excel data as new Excel file (Legacy logic from saveExcelData)
   * Now uploads to MinIO after saving locally
   */
  async saveProcessedExcel(data: {
    modello: string;
    lancio: string;
    qty: number;
    tableTaglio: string[][];
    tableOrlatura: string[][];
    originalFileName: string;
    progressivo: string;
  }): Promise<{ success: boolean; filename?: string; error?: string }> {
    try {
      const XLSX = require('xlsx');

      // Create new workbook
      const workbook = XLSX.utils.book_new();

      // Prepare data for sheet
      const sheetData = [];

      // Header rows
      sheetData.push(['ARTICOLO:', data.modello]);
      sheetData.push(['LANCIO:', data.lancio]);
      sheetData.push(['PAIA DA PRODURRE:', data.qty]);
      sheetData.push([]);
      sheetData.push(['TIPO', 'CODICE', 'DESCRIZIONE', 'UM', 'CONS/PA', 'TOTALE']);

      // TAGLIO section
      sheetData.push(['TAGLIO']);
      data.tableTaglio.forEach(row => {
        sheetData.push(row);
      });

      // ORLATURA section
      sheetData.push(['ORLATURA']);
      data.tableOrlatura.forEach(row => {
        sheetData.push(row);
      });

      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'SCHEDA TECNICA');

      // Delete original file from MinIO if exists
      const originalObjectName = `export/${data.progressivo}/${data.originalFileName}`;
      try {
        await this.storageService.deleteFile(originalObjectName);
      } catch (e) {
        // Ignore if file doesn't exist
      }

      // Delete original local file if exists
      const originalPath = path.join(this.srcDir, data.progressivo, data.originalFileName);
      if (fs.existsSync(originalPath)) {
        fs.unlinkSync(originalPath);
      }

      // Save to container storage temporarily
      const targetDir = path.join(this.srcDir, data.progressivo);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const filename = `${data.modello}.xlsx`;
      const filePath = path.join(targetDir, filename);

      // Write file locally
      XLSX.writeFile(workbook, filePath);

      // Upload to MinIO
      const objectName = `export/${data.progressivo}/${filename}`;
      await this.storageService.uploadFile(objectName, filePath, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'progressivo': data.progressivo,
        'modello': data.modello,
      });

      this.logger.log(`File uploaded to MinIO: ${objectName}`);

      // Delete local file after upload
      try {
        await fsp.unlink(filePath);
      } catch (e) {
        this.logger.warn(`Failed to delete temp file: ${filePath}`);
      }

      return { success: true, filename };
    } catch (error) {
      return {
        success: false,
        error: `Errore salvataggio Excel: ${error.message}`,
      };
    }
  }

  /**
   * Generate DDT from processed Excel files (Legacy generaDDT logic)
   * Reads all Excel files from MinIO, creates master articles if missing,
   * and creates document items with references to master articles
   */
  async generateDDT(progressivo: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // List all Excel files from MinIO for this progressivo
      const prefix = `export/${progressivo}/`;
      const files = await this.storageService.listFiles(prefix);

      const excelFiles = files.filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));

      if (excelFiles.length === 0) {
        return { success: false, error: 'Nessuna scheda Excel trovata' };
      }

      const XLSX = require('xlsx');
      const tempItems: Array<{
        codiceArticolo: string;
        descrizione: string;
        um: string;
        voceDoganale: string;
        qty: number;
      }> = [];

      // Process each Excel file
      for (const objectName of excelFiles) {
        // Download file from MinIO as buffer
        const buffer = await this.storageService.getFileBuffer(objectName);

        // Read Excel from buffer
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        // Extract lancio data (cells B1, B2, B3)
        const articolo = worksheet['B1'] ? String(worksheet['B1'].v) : '';
        const lancio = worksheet['B2'] ? String(worksheet['B2'].v) : '';
        const paia = worksheet['B3'] ? parseFloat(worksheet['B3'].v) || 0 : 0;

        // Get document
        const document = await this.prisma.exportDocument.findUnique({
          where: { progressivo },
        });

        if (!document) {
          return { success: false, error: 'Documento non trovato' };
        }

        // Insert lancio data
        await this.prisma.exportLaunchData.create({
          data: {
            documentoId: document.id,
            lancio,
            articolo,
            paia: Math.round(paia),
          },
        });

        // Extract rows starting from row 7 (index 6)
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        for (let rowNum = 6; rowNum <= range.e.r; rowNum++) {
          const row: string[] = [];

          // Read columns A-F (indices 0-5)
          for (let colNum = 0; colNum < 6; colNum++) {
            const cellAddress = XLSX.utils.encode_cell({ r: rowNum, c: colNum });
            const cell = worksheet[cellAddress];
            row.push(cell ? String(cell.v) : '');
          }

          // Skip specific rows (Legacy logic)
          if (row[0] === 'ORLATURA' || row[0] === 'AUTORIZZAZIONE:' || !row[1]) {
            continue;
          }

          // Extract data
          const codiceArticolo = row[1].trim();
          const descrizione = row[2].trim();
          const um = row[3].trim();
          const voceDoganale = ''; // Will be filled from master
          const qty = parseFloat(row[5]) || 0; // Column F (TOTALE)

          if (!codiceArticolo) continue;

          tempItems.push({
            codiceArticolo,
            descrizione,
            um,
            voceDoganale,
            qty,
          });
        }
      }

      // Consolidate items: aggregate by codiceArticolo (Legacy consolidateArticles logic)
      const consolidatedMap = new Map<string, typeof tempItems[0]>();
      for (const item of tempItems) {
        const key = item.codiceArticolo;
        if (consolidatedMap.has(key)) {
          const existing = consolidatedMap.get(key)!;
          existing.qty += item.qty;
        } else {
          consolidatedMap.set(key, { ...item });
        }
      }

      const consolidatedItems = Array.from(consolidatedMap.values());

      // Get document ID
      const document = await this.prisma.exportDocument.findUnique({
        where: { progressivo },
      });

      if (!document) {
        return { success: false, error: 'Documento non trovato' };
      }

      // For each item, check if article exists in MASTER, if not create it
      for (const item of consolidatedItems) {
        // Check if article exists in master
        let masterArticle = await this.prisma.exportArticleMaster.findFirst({
          where: { codiceArticolo: item.codiceArticolo },
        });

        // If not exists, create it
        if (!masterArticle) {
          masterArticle = await this.prisma.exportArticleMaster.create({
            data: {
              codiceArticolo: item.codiceArticolo,
              descrizione: item.descrizione,
              um: item.um,
              voceDoganale: item.voceDoganale || null,
              prezzoUnitario: 0, // Default price
            },
          });
        }

        // Create document item with reference to master article
        await this.prisma.exportDocumentItem.create({
          data: {
            documentoId: document.id,
            articleId: masterArticle.id,
            qtaOriginale: item.qty,
            qtaReale: item.qty,
            tipoRiga: 'articolo',
            isMancante: false,
          },
        });
      }

      return {
        success: true,
        message: `DDT generato con successo: ${files.length} schede processate, ${consolidatedItems.length} articoli inseriti`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Errore generazione DDT: ${error.message}`,
      };
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
