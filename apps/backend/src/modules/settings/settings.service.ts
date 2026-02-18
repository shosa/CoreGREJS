import { Injectable, BadRequestException, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/services/cache.service';
import { MinioService } from '../../services/minio.service';
import { ConfigService } from '@nestjs/config';
import * as XLSX from 'xlsx';
import * as nodemailer from 'nodemailer';
import * as os from 'os';
import axios from 'axios';

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
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);

  private importProgress: ImportProgress = {
    total: 0,
    processed: 0,
    status: 'pending',
  };

  private pendingImportData: any[] | null = null;
  private pendingAnalysis: ImportAnalysis | null = null;

  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private minioService: MinioService,
    private configService: ConfigService,
    private schedulerRegistry: SchedulerRegistry,
    private httpAdapterHost: HttpAdapterHost,
  ) {}

  async onModuleInit() {
    // Carica e registra i cron salvati al boot
    try {
      const cronJobs = await this.getCronJobs();
      for (const cron of cronJobs) {
        if (cron.enabled) {
          this.registerCronJob(cron);
        }
      }
      if (cronJobs.filter(c => c.enabled).length > 0) {
        this.logger.log(`${cronJobs.filter(c => c.enabled).length} cron job caricati`);
      }
    } catch {
      this.logger.warn('Errore caricamento cron jobs al boot');
    }
  }

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
    return this.cache.getOrSet('settings:modules', 300, async () => {
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
    });
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

    await this.cache.invalidate('settings:modules');
    return { success: true };
  }

  async updateMultipleModules(modules: Record<string, boolean>): Promise<{ success: boolean }> {
    for (const [moduleName, enabled] of Object.entries(modules)) {
      await this.updateModuleStatus(moduleName, enabled);
    }

    return { success: true };
  }

  // ==================== SMTP CONFIGURATION ====================

  async getSmtpConfig(): Promise<any> {
    return this.cache.getOrSet('settings:smtp', 600, async () => {
      const settings = await this.prisma.setting.findMany({
        where: {
          key: {
            startsWith: 'smtp.',
          },
        },
      });

      const config: any = {
        host: '',
        port: 587,
        secure: false,
      };

      settings.forEach(setting => {
        const key = setting.key.replace('smtp.', '');
        if (key === 'port') {
          config[key] = parseInt(setting.value || '587', 10);
        } else if (key === 'secure') {
          config[key] = setting.value === 'true';
        } else {
          config[key] = setting.value || '';
        }
      });

      return config;
    });
  }

  async updateSmtpConfig(config: any): Promise<{ success: boolean }> {
    const settings = [
      { key: 'smtp.host', value: config.host || '', type: 'string' },
      { key: 'smtp.port', value: String(config.port || 587), type: 'number' },
      { key: 'smtp.secure', value: config.secure ? 'true' : 'false', type: 'boolean' },
    ];

    for (const setting of settings) {
      await this.prisma.setting.upsert({
        where: { key: setting.key },
        update: {
          value: setting.value,
          updatedAt: new Date(),
        },
        create: {
          key: setting.key,
          value: setting.value,
          type: setting.type,
          group: 'smtp',
        },
      });
    }

    await this.cache.invalidate('settings:smtp');
    return { success: true };
  }

  // ==================== PRODUZIONE EMAIL CONFIGURATION ====================

  async getProduzioneEmailConfig(): Promise<string[]> {
    const setting = await this.prisma.setting.findUnique({
      where: { key: 'produzione.email.recipients' },
    });

    if (!setting || !setting.value) {
      return [];
    }

    try {
      return JSON.parse(setting.value);
    } catch {
      return [];
    }
  }

  async updateProduzioneEmailConfig(emails: string[]): Promise<{ success: boolean }> {
    await this.prisma.setting.upsert({
      where: { key: 'produzione.email.recipients' },
      update: {
        value: JSON.stringify(emails),
        updatedAt: new Date(),
      },
      create: {
        key: 'produzione.email.recipients',
        value: JSON.stringify(emails),
        type: 'json',
        group: 'produzione',
      },
    });

    return { success: true };
  }

  // ==================== GENERALI ====================

  async getGeneralConfig(): Promise<any> {
    return this.cache.getOrSet('settings:general', 600, async () => {
      const settings = await this.prisma.setting.findMany({
        where: { group: 'general' },
      });

      const defaults: Record<string, string> = {
        'general.nomeAzienda': '',
        'general.partitaIva': '',
        'general.indirizzo': '',
        'general.citta': '',
        'general.cap': '',
        'general.provincia': '',
        'general.telefono': '',
        'general.email': '',
        'general.valuta': 'EUR',
        'general.formatoData': 'DD/MM/YYYY',
        'general.timezone': 'Europe/Rome',
      };

      const config: Record<string, string> = { ...defaults };
      settings.forEach(s => {
        config[s.key] = s.value || defaults[s.key] || '';
      });

      return config;
    });
  }

  async updateGeneralConfig(data: Record<string, string>): Promise<{ success: boolean }> {
    for (const [key, value] of Object.entries(data)) {
      if (!key.startsWith('general.')) continue;
      await this.prisma.setting.upsert({
        where: { key },
        update: { value: String(value), updatedAt: new Date() },
        create: { key, value: String(value), type: 'string', group: 'general' },
      });
    }
    await this.cache.invalidate('settings:general');
    return { success: true };
  }

  // ==================== SICUREZZA ====================

  async getSecurityConfig(): Promise<any> {
    return this.cache.getOrSet('settings:security', 600, async () => {
      const settings = await this.prisma.setting.findMany({
        where: { group: 'security' },
      });

      const defaults: Record<string, string> = {
        'security.passwordMinLength': '8',
        'security.passwordRequireUppercase': 'true',
        'security.passwordRequireNumber': 'true',
        'security.passwordRequireSpecial': 'false',
        'security.sessionTimeoutMinutes': '480',
        'security.maxLoginAttempts': '5',
        'security.lockoutDurationMinutes': '15',
      };

      const config: Record<string, any> = {};
      for (const [key, defaultVal] of Object.entries(defaults)) {
        const setting = settings.find(s => s.key === key);
        const val = setting?.value ?? defaultVal;
        const shortKey = key.replace('security.', '');
        if (val === 'true' || val === 'false') {
          config[shortKey] = val === 'true';
        } else {
          config[shortKey] = parseInt(val) || val;
        }
      }
      return config;
    });
  }

  async updateSecurityConfig(data: Record<string, any>): Promise<{ success: boolean }> {
    for (const [shortKey, value] of Object.entries(data)) {
      const key = `security.${shortKey}`;
      const type = typeof value === 'boolean' ? 'boolean' : 'number';
      await this.prisma.setting.upsert({
        where: { key },
        update: { value: String(value), updatedAt: new Date() },
        create: { key, value: String(value), type, group: 'security' },
      });
    }
    await this.cache.invalidate('settings:security');
    return { success: true };
  }

  // ==================== EXPORT DEFAULTS ====================

  async getExportDefaults(): Promise<any> {
    return this.cache.getOrSet('settings:export-defaults', 600, async () => {
      const settings = await this.prisma.setting.findMany({
        where: { group: 'export' },
      });

      const defaults: Record<string, string> = {
        'export.trasportoDefault': '',
        'export.causaleDefault': '',
        'export.aspettoEsteriore': '',
        'export.porto': '',
        'export.valuta': 'EUR',
        'export.terzistaPredefinito': '',
        'export.noteDefault': '',
      };

      const config: Record<string, string> = {};
      for (const [key, defaultVal] of Object.entries(defaults)) {
        const setting = settings.find(s => s.key === key);
        config[key.replace('export.', '')] = setting?.value ?? defaultVal;
      }
      return config;
    });
  }

  async updateExportDefaults(data: Record<string, string>): Promise<{ success: boolean }> {
    for (const [shortKey, value] of Object.entries(data)) {
      const key = `export.${shortKey}`;
      await this.prisma.setting.upsert({
        where: { key },
        update: { value: String(value), updatedAt: new Date() },
        create: { key, value: String(value), type: 'string', group: 'export' },
      });
    }
    await this.cache.invalidate('settings:export-defaults');
    return { success: true };
  }

  // ==================== SOGLIE QUALITA ====================

  async getQualityThresholds(): Promise<any> {
    return this.cache.getOrSet('settings:quality', 600, async () => {
      const settings = await this.prisma.setting.findMany({
        where: { group: 'quality' },
      });

      const defaults: Record<string, string> = {
        'quality.sogliaDifettiPercentuale': '5',
        'quality.sogliaAllarme': '10',
        'quality.controlliMinimiGiorno': '0',
        'quality.autoChiusuraGiorni': '30',
      };

      const config: Record<string, number> = {};
      for (const [key, defaultVal] of Object.entries(defaults)) {
        const setting = settings.find(s => s.key === key);
        config[key.replace('quality.', '')] = parseFloat(setting?.value ?? defaultVal);
      }
      return config;
    });
  }

  async updateQualityThresholds(data: Record<string, number>): Promise<{ success: boolean }> {
    for (const [shortKey, value] of Object.entries(data)) {
      const key = `quality.${shortKey}`;
      await this.prisma.setting.upsert({
        where: { key },
        update: { value: String(value), updatedAt: new Date() },
        create: { key, value: String(value), type: 'number', group: 'quality' },
      });
    }
    await this.cache.invalidate('settings:quality');
    return { success: true };
  }

  // ==================== TEST SMTP ====================

  async testSmtp(recipientEmail: string): Promise<{ success: boolean; message: string }> {
    const config = await this.getSmtpConfig();

    if (!config.host) {
      throw new BadRequestException('Server SMTP non configurato');
    }

    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port || 587,
        secure: config.secure || false,
        // Non servono credenziali utente per il test, usa connessione anonima
        tls: { rejectUnauthorized: false },
      });

      await transporter.verify();

      return {
        success: true,
        message: `Connessione a ${config.host}:${config.port} riuscita`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Errore connessione: ${error.message}`,
      };
    }
  }

  // ==================== BACKUP / RIPRISTINO ====================

  async exportSettings(): Promise<any> {
    const settings = await this.prisma.setting.findMany({
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    });

    return {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      settings: settings.map(s => ({
        key: s.key,
        value: s.value,
        type: s.type,
        group: s.group,
      })),
    };
  }

  async importSettings(data: any): Promise<{ success: boolean; imported: number; skipped: number }> {
    if (!data?.settings || !Array.isArray(data.settings)) {
      throw new BadRequestException('Formato file non valido');
    }

    let imported = 0;
    let skipped = 0;

    for (const setting of data.settings) {
      if (!setting.key || setting.value === undefined) {
        skipped++;
        continue;
      }

      try {
        await this.prisma.setting.upsert({
          where: { key: setting.key },
          update: { value: String(setting.value), updatedAt: new Date() },
          create: {
            key: setting.key,
            value: String(setting.value),
            type: setting.type || 'string',
            group: setting.group || 'general',
          },
        });
        imported++;
      } catch {
        skipped++;
      }
    }

    // Invalida tutte le cache settings
    await this.cache.invalidatePattern('settings:*');
    await this.cache.invalidate('settings:modules', 'settings:smtp', 'settings:general', 'settings:security', 'settings:export-defaults', 'settings:quality');

    return { success: true, imported, skipped };
  }

  // ==================== SYSTEM INFO ====================

  async getSystemInfo(): Promise<any> {
    const [
      totalUsers,
      totalSettings,
      totalLogs,
      dbSize,
      cacheInfo,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.setting.count(),
      this.prisma.activityLog.count(),
      this.prisma.$queryRaw<any[]>`
        SELECT
          table_schema AS db,
          ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
        GROUP BY table_schema
      `.catch(() => [{ size_mb: 0 }]),
      this.cache.getInfo(),
    ]);

    return {
      server: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        uptime: Math.floor(process.uptime()),
        memoryUsage: {
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        },
        cpuCount: os.cpus().length,
        hostname: os.hostname(),
        totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024),
        freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024),
      },
      database: {
        sizeMb: dbSize[0]?.size_mb || 0,
        totalUsers,
        totalSettings,
        totalLogs,
      },
      cache: cacheInfo,
    };
  }

  async flushCache(): Promise<{ success: boolean; deleted: number }> {
    const deleted = await this.cache.flushAll();
    return { success: true, deleted };
  }

  // ==================== HEALTH CHECK ====================

  async getHealthCheck(): Promise<any> {
    const checks: Record<string, { status: 'ok' | 'error'; latency?: number; message?: string; details?: any }> = {};

    // MySQL
    const dbStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'ok', latency: Date.now() - dbStart, message: 'Connesso' };
    } catch (err: any) {
      checks.database = { status: 'error', latency: Date.now() - dbStart, message: err.message };
    }

    // Redis
    const redisStart = Date.now();
    try {
      const info = await this.cache.getInfo();
      checks.redis = {
        status: info?.connected ? 'ok' : 'error',
        latency: Date.now() - redisStart,
        message: info?.connected ? 'Connesso' : 'Non connesso',
        details: info,
      };
    } catch (err: any) {
      checks.redis = { status: 'error', latency: Date.now() - redisStart, message: err.message };
    }

    // MinIO
    const minioStart = Date.now();
    try {
      const ok = await this.minioService.ping();
      checks.minio = {
        status: ok ? 'ok' : 'error',
        latency: Date.now() - minioStart,
        message: ok ? 'Connesso' : 'Non raggiungibile',
      };
    } catch (err: any) {
      checks.minio = { status: 'error', latency: Date.now() - minioStart, message: err.message };
    }

    // Overall status
    const allOk = Object.values(checks).every(c => c.status === 'ok');

    return {
      status: allOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      checks,
    };
  }

  // ==================== JOBS / CODA ====================

  async getJobsOverview(): Promise<any> {
    const [
      totalJobs,
      queuedJobs,
      runningJobs,
      doneJobs,
      failedJobs,
      recentFailed,
      recentJobs,
    ] = await Promise.all([
      this.prisma.job.count(),
      this.prisma.job.count({ where: { status: 'queued' } }),
      this.prisma.job.count({ where: { status: 'running' } }),
      this.prisma.job.count({ where: { status: 'done' } }),
      this.prisma.job.count({ where: { status: 'failed' } }),
      this.prisma.job.findMany({
        where: { status: 'failed' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { select: { nome: true, userName: true } } },
      }),
      this.prisma.job.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { user: { select: { nome: true, userName: true } } },
      }),
    ]);

    // Conta per tipo
    const byType = await this.prisma.job.groupBy({
      by: ['type'],
      _count: true,
      orderBy: { _count: { type: 'desc' } },
      take: 15,
    });

    return {
      stats: {
        total: totalJobs,
        queued: queuedJobs,
        running: runningJobs,
        done: doneJobs,
        failed: failedJobs,
      },
      byType: byType.map(t => ({ type: t.type, count: t._count })),
      recentFailed,
      recentJobs,
    };
  }

  async retryFailedJob(jobId: string): Promise<any> {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new BadRequestException('Job non trovato');
    if (job.status !== 'failed') throw new BadRequestException('Solo job falliti possono essere ritentati');

    await this.prisma.job.update({
      where: { id: jobId },
      data: { status: 'queued', errorMessage: null, startedAt: null, finishedAt: null, progress: 0 },
    });

    return { success: true, message: 'Job rimesso in coda' };
  }

  async clearFailedJobs(): Promise<any> {
    const result = await this.prisma.job.deleteMany({ where: { status: 'failed' } });
    return { success: true, deleted: result.count };
  }

  async clearOldJobs(daysOld = 30): Promise<any> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);

    const result = await this.prisma.job.deleteMany({
      where: {
        status: { in: ['done', 'failed'] },
        createdAt: { lt: cutoff },
      },
    });

    return { success: true, deleted: result.count };
  }

  // ==================== WEBHOOKS ====================

  async getWebhooks(): Promise<any[]> {
    const setting = await this.prisma.setting.findUnique({
      where: { key: 'webhooks.config' },
    });

    if (!setting?.value) return [];

    try {
      return JSON.parse(setting.value);
    } catch {
      return [];
    }
  }

  async saveWebhooks(webhooks: any[]): Promise<{ success: boolean }> {
    await this.prisma.setting.upsert({
      where: { key: 'webhooks.config' },
      update: { value: JSON.stringify(webhooks), updatedAt: new Date() },
      create: { key: 'webhooks.config', value: JSON.stringify(webhooks), type: 'json', group: 'webhooks' },
    });

    await this.cache.invalidate('settings:webhooks');
    return { success: true };
  }

  async testWebhook(url: string): Promise<{ success: boolean; message: string; statusCode?: number }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'CoreGREJS-Webhook/1.0' },
        body: JSON.stringify({
          event: 'test',
          timestamp: new Date().toISOString(),
          data: { message: 'Test webhook da CoreGREJS' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      return {
        success: response.ok,
        message: response.ok
          ? `Risposta ${response.status} ${response.statusText}`
          : `Errore ${response.status}: ${response.statusText}`,
        statusCode: response.status,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Errore connessione: ${err.message}`,
      };
    }
  }

  // ==================== CRON JOBS ====================

  async getCronJobs(): Promise<any[]> {
    const setting = await this.prisma.setting.findUnique({
      where: { key: 'cron.jobs' },
    });
    if (!setting?.value) return [];
    try {
      return JSON.parse(setting.value);
    } catch {
      return [];
    }
  }

  async saveCronJobs(jobs: any[]): Promise<{ success: boolean }> {
    await this.prisma.setting.upsert({
      where: { key: 'cron.jobs' },
      update: { value: JSON.stringify(jobs), updatedAt: new Date() },
      create: { key: 'cron.jobs', value: JSON.stringify(jobs), type: 'json', group: 'cron' },
    });
    await this.cache.invalidate('settings:cron');

    // Ricarica tutti i cron registrati
    this.reloadAllCronJobs(jobs);

    return { success: true };
  }

  async getCronLog(page = 1, limit = 20): Promise<any> {
    const offset = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where: { module: 'cron' },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.activityLog.count({ where: { module: 'cron' } }),
    ]);

    return {
      data: logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAvailableEndpoints(): Promise<Array<{ method: string; path: string; params: string[] }>> {
    const server = this.httpAdapterHost.httpAdapter.getInstance();
    const routes: Array<{ method: string; path: string; params: string[] }> = [];

    // Express internals: app._router.stack contiene le route registrate
    const stack = server._router?.stack || [];
    for (const layer of stack) {
      if (layer.route) {
        // Route diretta
        const path = layer.route.path;
        const methods = Object.keys(layer.route.methods).filter(m => layer.route.methods[m]);
        for (const method of methods) {
          const params = (path.match(/:([^/]+)/g) || []).map((p: string) => p.substring(1));
          routes.push({ method: method.toUpperCase(), path, params });
        }
      } else if (layer.name === 'router' && layer.handle?.stack) {
        // Sub-router (NestJS monta i controller come sub-router)
        const prefix = layer.regexp?.source
          ?.replace('\\/?(?=\\/|$)', '')
          ?.replace(/\\\//g, '/')
          ?.replace(/^\^/, '')
          ?.replace(/\$.*$/, '')
          || '';
        for (const subLayer of layer.handle.stack) {
          if (subLayer.route) {
            const fullPath = prefix + subLayer.route.path;
            const methods = Object.keys(subLayer.route.methods).filter(m => subLayer.route.methods[m]);
            for (const method of methods) {
              const params = (fullPath.match(/:([^/]+)/g) || []).map((p: string) => p.substring(1));
              routes.push({ method: method.toUpperCase(), path: fullPath, params });
            }
          }
        }
      }
    }

    // Filtra rotte interne/auth e ordina
    const excluded = ['/api/auth', '/api/health', '/api/settings/cron'];
    return routes
      .filter(r => r.path.startsWith('/api/'))
      .filter(r => !excluded.some(ex => r.path.startsWith(ex)))
      .filter(r => !['HEAD', 'OPTIONS'].includes(r.method))
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  private registerCronJob(cron: any) {
    const cronName = `cron_${cron.id}`;

    // Rimuovi se esiste già
    try {
      this.schedulerRegistry.deleteCronJob(cronName);
    } catch {
      // Non esiste, ok
    }

    try {
      const job = new CronJob(cron.expression, async () => {
        this.logger.log(`Cron eseguito: ${cron.label || cron.endpoint}`);
        try {
          const baseUrl = `http://127.0.0.1:${this.configService.get('PORT') || 3011}`;
          // Sostituisci parametri nel path (es. :id -> valore salvato)
          let endpoint = cron.endpoint;
          if (cron.paramValues) {
            for (const [param, value] of Object.entries(cron.paramValues)) {
              endpoint = endpoint.replace(`:${param}`, String(value));
            }
          }
          const url = `${baseUrl}${endpoint}`;
          const method = (cron.method || 'GET').toUpperCase();

          const response = method === 'POST'
            ? await axios.post(url, cron.body || {}, { timeout: 30000 })
            : method === 'PUT'
            ? await axios.put(url, cron.body || {}, { timeout: 30000 })
            : method === 'DELETE'
            ? await axios.delete(url, { timeout: 30000 })
            : await axios.get(url, { timeout: 30000 });

          // Log successo
          await this.prisma.activityLog.create({
            data: {
              module: 'cron',
              action: 'execute',
              entity: cron.label || cron.endpoint,
              description: `Cron "${cron.label}" eseguito con successo (${response.status})`,
            },
          });
        } catch (err: any) {
          // Log errore
          await this.prisma.activityLog.create({
            data: {
              module: 'cron',
              action: 'execute_error',
              entity: cron.label || cron.endpoint,
              description: `Errore cron "${cron.label}": ${err.message}`,
            },
          });
        }
      });

      this.schedulerRegistry.addCronJob(cronName, job);
      job.start();
    } catch (err: any) {
      this.logger.error(`Errore registrazione cron ${cronName}: ${err.message}`);
    }
  }

  private reloadAllCronJobs(jobs: any[]) {
    // Rimuovi tutti i cron esistenti con prefisso cron_
    const existing = this.schedulerRegistry.getCronJobs();
    existing.forEach((_, name) => {
      if (name.startsWith('cron_')) {
        try {
          this.schedulerRegistry.deleteCronJob(name);
        } catch {
          // Ignora
        }
      }
    });

    // Registra quelli abilitati
    for (const cron of jobs) {
      if (cron.enabled) {
        this.registerCronJob(cron);
      }
    }
  }

  // ==================== CRONOLOGIA MODIFICHE ====================

  async getSettingsChangelog(page = 1, limit = 20): Promise<any> {
    const offset = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where: { module: 'settings' },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          user: {
            select: { nome: true, userName: true },
          },
        },
      }),
      this.prisma.activityLog.count({ where: { module: 'settings' } }),
    ]);

    return {
      data: logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
