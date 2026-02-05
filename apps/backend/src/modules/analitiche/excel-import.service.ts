import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as XLSX from 'xlsx';

// Mappatura colonne Excel ai campi del database
// Colonne richieste dall'utente:
// TIPO DOCUMENTO, DATA DOCUMENTO, DESCRIZIONE (dopo LINEA), ARTICOLO,
// DESCRIZIONE (dopo ARTICOLO), TIPOLOGIA ORDINE, QUANTITÀ, PREZZO UNITARIO
const COLUMN_MAPPING = {
  'TIPO DOCUMENTO': 'tipoDocumento',
  'NUMERO DOCUMENTO': 'numeroDocumento',
  'DATA DOCUMENTO': 'dataDocumento',
  'ARTICOLO': 'articolo',
  'TIPOLOGIA ORDINE': 'tipologiaOrdine',
  'QUANTITÀ': 'quantita',
  'QUANTITA': 'quantita', // Variante senza accento
  'PREZZO UNITARIO': 'prezzoUnitario',
};

// Indici specifici per le DESCRIZIONI (basati sulla struttura fornita)
// L'utente ha specificato che ci sono 2 colonne DESCRIZIONE:
// - DESCRIZIONE dopo LINEA (indice ~25 nella struttura)
// - DESCRIZIONE dopo ARTICOLO (indice ~31 nella struttura)

@Injectable()
export class ExcelImportService {
  constructor(private prisma: PrismaService) {}

  async processExcelFile(
    buffer: Buffer,
    fileName: string,
    fileSize: number,
    userId?: number
  ): Promise<{ importId: number; recordsCount: number }> {
    try {
      // Parse Excel file
      const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON with header row
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: null,
        raw: false,
      }) as any[][];

      if (jsonData.length < 2) {
        throw new BadRequestException('Il file Excel non contiene dati sufficienti');
      }

      // Get headers from first row
      const headers = jsonData[0] as string[];
      const dataRows = jsonData.slice(1);

      // Find column indices
      const columnIndices = this.findColumnIndices(headers);

      // Create import record
      const importRecord = await this.prisma.analiticaImport.create({
        data: {
          fileName,
          fileSize,
          stato: 'in_corso',
          userId,
          recordsCount: 0,
        },
      });

      try {
        // Process rows - prima raccogliamo tutti i record grezzi
        const rawRecords: any[] = [];

        for (const row of dataRows) {
          // Skip empty rows
          if (!row || row.every((cell) => !cell)) continue;

          const record = this.mapRowToRecord(row, columnIndices, headers);

          // Skip rows without articolo (key field)
          if (!record.articolo) continue;

          rawRecords.push(record);
        }

        // STEP 1: Raggruppa e somma record duplicati
        // Chiave: tipoDocumento + numeroDocumento + articolo + prezzoUnitario
        const groupedRecords = this.groupAndSumRecords(rawRecords);

        // STEP 2: Recupera i costi esistenti per gli articoli già presenti in DB
        const existingCosts = await this.getExistingCostsForArticles(
          groupedRecords.map(r => r.articolo).filter(Boolean) as string[]
        );

        // STEP 3: Applica i costi esistenti ai nuovi record
        const finalRecords = groupedRecords.map(record => {
          const existingCost = existingCosts.get(record.articolo);

          return {
            ...record,
            importId: importRecord.id,
            // Origine sempre null (da definire manualmente)
            prodottoEstero: null,
            // Reparto finale sempre null
            repartoFinaleId: null,
            // Copia costi da record esistenti se presenti
            costoTaglio: existingCost?.costoTaglio ?? null,
            costoOrlatura: existingCost?.costoOrlatura ?? null,
            costoStrobel: existingCost?.costoStrobel ?? null,
            altriCosti: existingCost?.altriCosti ?? null,
            costoMontaggio: existingCost?.costoMontaggio ?? null,
            // Copia anche reparto se esistente
            repartoId: existingCost?.repartoId ?? null,
          };
        });

        // Bulk insert records
        if (finalRecords.length > 0) {
          await this.prisma.analiticaRecord.createMany({
            data: finalRecords,
          });
        }

        // Update import record
        await this.prisma.analiticaImport.update({
          where: { id: importRecord.id },
          data: {
            stato: 'completato',
            recordsCount: finalRecords.length,
          },
        });

        return {
          importId: importRecord.id,
          recordsCount: finalRecords.length,
        };
      } catch (error) {
        // Update import record with error
        await this.prisma.analiticaImport.update({
          where: { id: importRecord.id },
          data: {
            stato: 'errore',
            errorMessage: error.message,
          },
        });
        throw error;
      }
    } catch (error) {
      throw new BadRequestException(
        `Errore durante l'elaborazione del file Excel: ${error.message}`
      );
    }
  }

  private findColumnIndices(headers: string[]): Record<string, number> {
    const indices: Record<string, number> = {};

    // Trova indici delle colonne standard
    headers.forEach((header, index) => {
      if (!header) return;
      const normalizedHeader = header.toString().trim().toUpperCase();

      // Mappatura diretta
      if (COLUMN_MAPPING[normalizedHeader]) {
        indices[COLUMN_MAPPING[normalizedHeader]] = index;
      }
    });

    // Trova le colonne DESCRIZIONE in modo specifico
    // Cerchiamo LINEA e poi la DESCRIZIONE successiva
    // Cerchiamo ARTICOLO e poi la DESCRIZIONE successiva
    let lineaIndex = -1;
    let articoloIndex = -1;

    headers.forEach((header, index) => {
      if (!header) return;
      const normalizedHeader = header.toString().trim().toUpperCase();

      if (normalizedHeader === 'LINEA') {
        lineaIndex = index;
      }
      if (normalizedHeader === 'ARTICOLO') {
        articoloIndex = index;
      }
    });

    // Trova DESCRIZIONE dopo LINEA
    if (lineaIndex >= 0) {
      for (let i = lineaIndex + 1; i < headers.length && i < lineaIndex + 3; i++) {
        const header = headers[i]?.toString().trim().toUpperCase();
        if (header === 'DESCRIZIONE') {
          indices['linea'] = i; // La descrizione della linea
          break;
        }
      }
    }

    // Trova DESCRIZIONE dopo ARTICOLO
    if (articoloIndex >= 0) {
      for (let i = articoloIndex + 1; i < headers.length && i < articoloIndex + 3; i++) {
        const header = headers[i]?.toString().trim().toUpperCase();
        if (header === 'DESCRIZIONE') {
          indices['descrizioneArt'] = i;
          break;
        }
      }
    }

    return indices;
  }

  private mapRowToRecord(
    row: any[],
    columnIndices: Record<string, number>,
    headers: string[]
  ): any {
    const record: any = {};

    // Map each field
    for (const [field, index] of Object.entries(columnIndices)) {
      if (index === undefined || index < 0 || index >= row.length) continue;

      const value = row[index];
      if (value === null || value === undefined || value === '') continue;

      switch (field) {
        case 'dataDocumento':
          // Parse date
          if (value instanceof Date) {
            record.dataDocumento = value;
          } else {
            const parsed = this.parseDate(value.toString());
            if (parsed) record.dataDocumento = parsed;
          }
          break;

        case 'quantita':
        case 'prezzoUnitario':
        case 'costoTaglio':
        case 'costoOrlatura':
        case 'costoStrobel':
        case 'altriCosti':
        case 'costoMontaggio':
          // Parse decimal
          const num = this.parseDecimal(value);
          if (num !== null) record[field] = num;
          break;

        default:
          // String fields
          record[field] = value.toString().trim();
      }
    }

    return record;
  }

  private parseDate(value: string): Date | null {
    if (!value) return null;

    // Try various date formats
    const formats = [
      // DD/MM/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      // DD-MM-YYYY
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
      // YYYY-MM-DD
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    ];

    for (const format of formats) {
      const match = value.match(format);
      if (match) {
        let day, month, year;
        if (format.source.startsWith('^(\\d{4})')) {
          // YYYY-MM-DD
          [, year, month, day] = match;
        } else {
          // DD/MM/YYYY or DD-MM-YYYY
          [, day, month, year] = match;
        }
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) return date;
      }
    }

    // Try native Date parsing
    const nativeDate = new Date(value);
    if (!isNaN(nativeDate.getTime())) return nativeDate;

    return null;
  }

  private parseDecimal(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;

    // Convert to string and clean
    let strValue = value.toString().trim();

    // Replace comma with dot for decimal separator
    strValue = strValue.replace(',', '.');

    // Remove thousands separator (dots if comma was decimal)
    strValue = strValue.replace(/\.(?=.*\.)/g, '');

    const num = parseFloat(strValue);
    return isNaN(num) ? null : num;
  }

  /**
   * Raggruppa record con stessa chiave e somma le quantità
   * Chiave: tipoDocumento + numeroDocumento + articolo + prezzoUnitario
   */
  private groupAndSumRecords(records: any[]): any[] {
    const grouped = new Map<string, any>();

    for (const record of records) {
      // Crea chiave univoca
      const key = [
        record.tipoDocumento || '',
        record.numeroDocumento || '',
        record.articolo || '',
        record.prezzoUnitario?.toString() || '',
      ].join('||');

      if (grouped.has(key)) {
        // Somma quantità al record esistente
        const existing = grouped.get(key);
        const existingQty = existing.quantita || 0;
        const newQty = record.quantita || 0;
        existing.quantita = existingQty + newQty;
      } else {
        // Nuovo record
        grouped.set(key, { ...record });
      }
    }

    return Array.from(grouped.values());
  }

  /**
   * Recupera i costi esistenti per gli articoli già presenti in DB
   * Prende il record più recente per ogni articolo
   */
  private async getExistingCostsForArticles(
    articoli: string[]
  ): Promise<Map<string, {
    costoTaglio: number | null;
    costoOrlatura: number | null;
    costoStrobel: number | null;
    altriCosti: number | null;
    costoMontaggio: number | null;
    repartoId: number | null;
  }>> {
    const result = new Map();

    if (articoli.length === 0) return result;

    // Rimuovi duplicati
    const uniqueArticoli = [...new Set(articoli)];

    // Recupera l'ultimo record per ogni articolo che ha almeno un costo impostato
    const existingRecords = await this.prisma.analiticaRecord.findMany({
      where: {
        articolo: { in: uniqueArticoli },
        OR: [
          { costoTaglio: { not: null } },
          { costoOrlatura: { not: null } },
          { costoStrobel: { not: null } },
          { altriCosti: { not: null } },
          { costoMontaggio: { not: null } },
          { repartoId: { not: null } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        articolo: true,
        costoTaglio: true,
        costoOrlatura: true,
        costoStrobel: true,
        altriCosti: true,
        costoMontaggio: true,
        repartoId: true,
      },
    });

    // Prendi solo il primo (più recente) per ogni articolo
    for (const record of existingRecords) {
      if (!result.has(record.articolo)) {
        result.set(record.articolo, {
          costoTaglio: record.costoTaglio ? Number(record.costoTaglio) : null,
          costoOrlatura: record.costoOrlatura ? Number(record.costoOrlatura) : null,
          costoStrobel: record.costoStrobel ? Number(record.costoStrobel) : null,
          altriCosti: record.altriCosti ? Number(record.altriCosti) : null,
          costoMontaggio: record.costoMontaggio ? Number(record.costoMontaggio) : null,
          repartoId: record.repartoId,
        });
      }
    }

    return result;
  }

  // Preview file without importing
  async previewExcelFile(buffer: Buffer): Promise<{
    headers: string[];
    sampleRows: any[][];
    totalRows: number;
    mappedColumns: Record<string, string>;
  }> {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
      raw: false,
    }) as any[][];

    const headers = (jsonData[0] || []) as string[];
    const columnIndices = this.findColumnIndices(headers);

    // Invert mapping for display
    const mappedColumns: Record<string, string> = {};
    for (const [field, index] of Object.entries(columnIndices)) {
      if (headers[index]) {
        mappedColumns[headers[index]] = field;
      }
    }

    return {
      headers,
      sampleRows: jsonData.slice(1, 6), // First 5 data rows
      totalRows: jsonData.length - 1,
      mappedColumns,
    };
  }
}
