import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as XLSX from 'xlsx';

// Colonne attese nell'ordine esatto del Legacy
const EXPECTED_COLUMNS = [
  'St', 'Ordine', 'Rg', 'CCli', 'Ragione Sociale', 'Cartel', 'Commessa Cli',
  'PO', 'Articolo', 'Descrizione Articolo', 'Nu', 'Marca Etich', 'Ln',
  'P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08', 'P09', 'P10',
  'P11', 'P12', 'P13', 'P14', 'P15', 'P16', 'P17', 'P18', 'P19', 'P20', 'Tot'
];

export interface ImportProgress {
  total: number;
  processed: number;
  status: 'pending' | 'analyzing' | 'ready' | 'processing' | 'completed' | 'error';
  message?: string;
}

export interface ImportAnalysis {
  totalRows: number;
  toInsert: number;
  toUpdate: number;
  toDelete: number;
  preserved: number;
  currentInDb: number;
}

@Injectable()
export class SettingsService {
  private importProgress: ImportProgress = {
    total: 0,
    processed: 0,
    status: 'pending',
  };

  private pendingImportData: any[] | null = null;
  private pendingAnalysis: ImportAnalysis | null = null;

  constructor(private prisma: PrismaService) {}

  getImportProgress(): ImportProgress {
    return this.importProgress;
  }

  // Step 1: Analyze file without importing
  async analyzeExcel(buffer: Buffer): Promise<ImportAnalysis> {
    this.importProgress = { total: 0, processed: 0, status: 'analyzing' };

    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });

      if (!workbook.SheetNames.length) {
        throw new BadRequestException('File Excel vuoto o non valido');
      }

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });

      if (jsonData.length < 2) {
        throw new BadRequestException('File Excel senza dati');
      }

      // Validate headers
      const headers = (jsonData[0] as string[]).map(h => String(h || '').trim());
      const missingColumns = EXPECTED_COLUMNS.filter(col => !headers.includes(col));
      if (missingColumns.length > 5) {
        throw new BadRequestException(`Colonne mancanti: ${missingColumns.join(', ')}`);
      }

      // Parse rows
      const rows: any[] = [];
      const fileCartelli = new Set<number>();

      for (let i = 1; i < jsonData.length; i++) {
        const rowArray = jsonData[i] as any[];
        if (!rowArray || rowArray.length === 0) continue;

        const rowData: any = {};
        EXPECTED_COLUMNS.forEach((col, idx) => {
          rowData[col] = rowArray[idx];
        });

        if (!rowData['Articolo'] && !rowData['Cartel']) continue;

        const cartel = this.parseIntOrNull(rowData['Cartel']);
        if (cartel) fileCartelli.add(cartel);

        rows.push(rowData);
      }

      // Get current DB state
      const currentInDb = await this.prisma.coreData.count();
      const existingCartelli = await this.prisma.coreData.findMany({
        select: { cartel: true },
        where: { cartel: { not: null } },
      });
      const dbCartelli = new Set(existingCartelli.map(r => r.cartel!));

      // Get preserved cartellini
      const preservedCartelli = await this.getPreservedCartelli();

      // Calculate stats
      let toInsert = 0;
      let toUpdate = 0;

      for (const cartel of fileCartelli) {
        if (dbCartelli.has(cartel)) {
          toUpdate++;
        } else {
          toInsert++;
        }
      }

      // Cartellini in DB but not in file (will be deleted unless preserved)
      let toDelete = 0;
      for (const cartel of dbCartelli) {
        if (!fileCartelli.has(cartel) && !preservedCartelli.has(cartel)) {
          toDelete++;
        }
      }

      const analysis: ImportAnalysis = {
        totalRows: rows.length,
        toInsert,
        toUpdate,
        toDelete,
        preserved: preservedCartelli.size,
        currentInDb,
      };

      // Store for later import
      this.pendingImportData = rows;
      this.pendingAnalysis = analysis;
      this.importProgress = { total: rows.length, processed: 0, status: 'ready' };

      return analysis;
    } catch (error: any) {
      this.importProgress = { total: 0, processed: 0, status: 'error', message: error.message };
      this.pendingImportData = null;
      this.pendingAnalysis = null;
      throw new BadRequestException(error.message);
    }
  }

  // Step 2: Execute import (after analysis confirmation)
  async executeImport(): Promise<{ success: boolean; message: string; stats: any }> {
    if (!this.pendingImportData || this.importProgress.status !== 'ready') {
      throw new BadRequestException('Nessun import in attesa. Esegui prima l\'analisi del file.');
    }

    const rows = this.pendingImportData;
    this.importProgress = { total: rows.length, processed: 0, status: 'processing' };

    try {
      const preservedCartelli = await this.getPreservedCartelli();

      // Import without transaction for progress updates
      const deleteResult = await this.prisma.coreData.deleteMany({
        where: {
          cartel: {
            notIn: Array.from(preservedCartelli),
          },
        },
      });

      let inserted = 0;
      let updated = 0;
      const errors: string[] = [];

      const chunkSize = 50;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);

        for (const row of chunk) {
          try {
            const cartel = this.parseIntOrNull(row['Cartel']);

            const data = {
              st: row['St'] ? String(row['St']).substring(0, 3) : null,
              ordine: this.parseIntOrNull(row['Ordine']),
              rg: this.parseIntOrNull(row['Rg']),
              cCli: this.parseIntOrNull(row['CCli']),
              ragioneSociale: row['Ragione Sociale'] ? String(row['Ragione Sociale']).substring(0, 35) : null,
              cartel,
              commessaCli: row['Commessa Cli'] ? String(row['Commessa Cli']).substring(0, 20) : null,
              po: row['PO'] ? String(row['PO']).substring(0, 255) : null,
              articolo: String(row['Articolo'] || '').substring(0, 255),
              descrizioneArticolo: String(row['Descrizione Articolo'] || '').substring(0, 255),
              nu: row['Nu'] ? String(row['Nu']).substring(0, 2) : null,
              marcaEtich: row['Marca Etich'] ? String(row['Marca Etich']).substring(0, 13) : null,
              ln: row['Ln'] ? String(row['Ln']).substring(0, 2) : null,
              p01: this.parseIntOrNull(row['P01']),
              p02: this.parseIntOrNull(row['P02']),
              p03: this.parseIntOrNull(row['P03']),
              p04: this.parseIntOrNull(row['P04']),
              p05: this.parseIntOrNull(row['P05']),
              p06: this.parseIntOrNull(row['P06']),
              p07: this.parseIntOrNull(row['P07']),
              p08: this.parseIntOrNull(row['P08']),
              p09: this.parseIntOrNull(row['P09']),
              p10: this.parseIntOrNull(row['P10']),
              p11: this.parseIntOrNull(row['P11']),
              p12: this.parseIntOrNull(row['P12']),
              p13: this.parseIntOrNull(row['P13']),
              p14: this.parseIntOrNull(row['P14']),
              p15: this.parseIntOrNull(row['P15']),
              p16: this.parseIntOrNull(row['P16']),
              p17: this.parseIntOrNull(row['P17']),
              p18: this.parseIntOrNull(row['P18']),
              p19: this.parseIntOrNull(row['P19']),
              p20: this.parseIntOrNull(row['P20']),
              tot: this.parseIntOrNull(row['Tot']),
            };

            if (cartel && preservedCartelli.has(cartel)) {
              await this.prisma.coreData.updateMany({
                where: { cartel },
                data,
              });
              updated++;
            } else if (cartel) {
              await this.prisma.coreData.create({ data });
              inserted++;
            }
          } catch (err: any) {
            errors.push(`Riga con Cartel ${row['Cartel']}: ${err.message}`);
          }
        }

        this.importProgress.processed = Math.min(i + chunkSize, rows.length);
      }

      const stats = {
        deleted: deleteResult.count,
        inserted,
        updated,
        preserved: preservedCartelli.size,
        errors: errors.slice(0, 10),
      };

      this.importProgress.status = 'completed';
      this.importProgress.message = `Import completato: ${inserted} inseriti, ${updated} aggiornati, ${preservedCartelli.size} preservati, ${deleteResult.count} eliminati`;

      // Clear pending data
      this.pendingImportData = null;
      this.pendingAnalysis = null;

      return {
        success: true,
        message: this.importProgress.message,
        stats,
      };
    } catch (error: any) {
      this.importProgress.status = 'error';
      this.importProgress.message = error.message;
      throw new BadRequestException(error.message);
    }
  }

  // Cancel pending import
  cancelImport(): void {
    this.pendingImportData = null;
    this.pendingAnalysis = null;
    this.importProgress = { total: 0, processed: 0, status: 'pending' };
  }

  private async getPreservedCartelli(): Promise<Set<number>> {
    const trackLinks = await this.prisma.trackLink.findMany({
      select: { cartel: true },
      distinct: ['cartel'],
    });
    return new Set(trackLinks.map(l => l.cartel));
  }

  private parseIntOrNull(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const num = parseInt(String(value), 10);
    return isNaN(num) ? null : num;
  }

  // ==================== MODULE MANAGEMENT ====================

  async getActiveModules(): Promise<Record<string, boolean>> {
    const settings = await this.prisma.setting.findMany({
      where: {
        key: {
          startsWith: 'module.',
        },
      },
    });

    const modules: Record<string, boolean> = {};

    for (const setting of settings) {
      const moduleName = setting.key.replace('module.', '').replace('.enabled', '');
      modules[moduleName] = setting.value === 'true';
    }

    return modules;
  }

  async updateModuleStatus(moduleName: string, enabled: boolean): Promise<{ success: boolean }> {
    const key = `module.${moduleName}.enabled`;

    await this.prisma.setting.upsert({
      where: { key },
      update: {
        value: enabled ? 'true' : 'false',
        updatedAt: new Date(),
      },
      create: {
        key,
        value: enabled ? 'true' : 'false',
        type: 'boolean',
        group: 'modules',
      },
    });

    return { success: true };
  }

  async updateMultipleModules(modules: Record<string, boolean>): Promise<{ success: boolean }> {
    for (const [moduleName, enabled] of Object.entries(modules)) {
      await this.updateModuleStatus(moduleName, enabled);
    }

    return { success: true };
  }
}
