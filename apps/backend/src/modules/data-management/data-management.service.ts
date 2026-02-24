import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface QueryOptions {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
}

interface AuditLogOptions {
  page: number;
  limit: number;
  tableName?: string;
}

@Injectable()
export class DataManagementService {
  constructor(private prisma: PrismaService) {}

  // Mappa delle tabelle gestibili con metadata
  private readonly managedTables = {
    // Auth Module
    user: {
      model: 'user',
      displayName: 'Utenti',
      searchFields: ['userName', 'nome', 'mail'],
    },
    permission: {
      model: 'permission',
      displayName: 'Permessi',
      searchFields: [],
    },
    authWidgetConfig: {
      model: 'authWidgetConfig',
      displayName: 'Configurazione Widget',
      searchFields: [],
    },

    // Core Module
    activityLog: {
      model: 'activityLog',
      displayName: 'Log Attività',
      searchFields: ['module', 'action', 'entity', 'description'],
    },
    setting: {
      model: 'setting',
      displayName: 'Impostazioni',
      searchFields: ['key', 'value', 'group'],
      noConvert: ['value'], // Il campo value è sempre String, anche per booleani
    },
    coreData: {
      model: 'coreData',
      displayName: 'Dati Core (Legacy)',
      searchFields: ['articolo', 'descrizioneArticolo', 'ragioneSociale', 'commessaCli'],
    },
    coreAnagrafica: {
      model: 'coreAnagrafica',
      displayName: 'Anagrafica Core',
      searchFields: ['codice', 'nome', 'tipo'],
    },
    job: {
      model: 'job',
      displayName: 'Jobs',
      searchFields: ['type', 'status'],
      idType: 'string', // UUID
    },

    // Riparazioni Module
    riparazione: {
      model: 'riparazione',
      displayName: 'Riparazioni',
      searchFields: ['idRiparazione', 'cartellino', 'causale'],
    },
    reparto: {
      model: 'reparto',
      displayName: 'Reparti',
      searchFields: ['nome', 'codice', 'descrizione'],
    },
    laboratorio: {
      model: 'laboratorio',
      displayName: 'Laboratori',
      searchFields: ['nome', 'codice', 'indirizzo'],
    },
    numerata: {
      model: 'numerata',
      displayName: 'Numerate (Taglie)',
      searchFields: ['idNumerata'],
    },

    // Quality Module (cq_)
    qualityRecord: {
      model: 'qualityRecord',
      displayName: 'Record Qualità',
      searchFields: ['cartellino', 'commessa', 'modello', 'note'],
    },
    qualityDepartment: {
      model: 'qualityDepartment',
      displayName: 'Dipartimenti Qualità',
      searchFields: ['nome', 'codice', 'descrizione'],
    },
    qualityDefectType: {
      model: 'qualityDefectType',
      displayName: 'Tipi Difetto',
      searchFields: ['nome', 'codice', 'categoria'],
    },
    qualityException: {
      model: 'qualityException',
      displayName: 'Eccezioni Qualità',
      searchFields: ['commessa', 'modello', 'tipo', 'descrizione'],
    },

    // Export Module (exp_)
    exportDocument: {
      model: 'exportDocument',
      displayName: 'Documenti DDT',
      searchFields: ['progressivo', 'autorizzazione', 'commento'],
    },
    exportDocumentItem: {
      model: 'exportDocumentItem',
      displayName: 'Righe DDT',
      searchFields: ['codiceLibero', 'descrizioneLibera'],
    },
    exportArticleMaster: {
      model: 'exportArticleMaster',
      displayName: 'Anagrafica Articoli',
      searchFields: ['codiceArticolo', 'descrizione', 'voceDoganale'],
    },
    exportTerzista: {
      model: 'exportTerzista',
      displayName: 'Terzisti',
      searchFields: ['ragioneSociale', 'nazione', 'indirizzo1'],
    },
    exportDocumentFooter: {
      model: 'exportDocumentFooter',
      displayName: 'Piede Documenti',
      searchFields: ['aspettoColli', 'trasportatore'],
    },
    exportMissingData: {
      model: 'exportMissingData',
      displayName: 'Dati Mancanti',
      searchFields: [],
    },
    exportLaunchData: {
      model: 'exportLaunchData',
      displayName: 'Lanci DDT',
      searchFields: ['lancio', 'articolo'],
    },

    // Tracking Module (track_)
    trackLink: {
      model: 'trackLink',
      displayName: 'Collegamenti Tracking',
      searchFields: ['lot', 'note'],
    },
    trackType: {
      model: 'trackType',
      displayName: 'Tipi Tracking',
      searchFields: ['name', 'note'],
    },
    trackLotInfo: {
      model: 'trackLotInfo',
      displayName: 'Info Lotti',
      searchFields: ['lot', 'doc', 'note'],
      primaryKey: 'lot', // PK è 'lot' non 'id'
      idType: 'string',
    },
    trackOrderInfo: {
      model: 'trackOrderInfo',
      displayName: 'Info Ordini',
      searchFields: ['ordine'],
    },
    trackSku: {
      model: 'trackSku',
      displayName: 'SKU Tracking',
      searchFields: ['art', 'sku'],
      primaryKey: 'art', // PK è 'art' non 'id'
      idType: 'string',
    },
    trackLinkArchive: {
      model: 'trackLinkArchive',
      displayName: 'Archivio Storico',
      searchFields: ['lot', 'commessa', 'articolo', 'ragioneSoc', 'typeName'],
    },

    // Produzione Module (prod_)
    productionPhase: {
      model: 'productionPhase',
      displayName: 'Fasi Produzione',
      searchFields: ['nome', 'codice', 'descrizione'],
    },
    productionDepartment: {
      model: 'productionDepartment',
      displayName: 'Reparti Produzione',
      searchFields: ['nome', 'codice', 'descrizione'],
    },
    productionRecord: {
      model: 'productionRecord',
      displayName: 'Record Produzione',
      searchFields: [],
    },
    productionValue: {
      model: 'productionValue',
      displayName: 'Valori Produzione',
      searchFields: ['note'],
    },

    // SCM Module (scm_)
    scmLaboratory: {
      model: 'scmLaboratory',
      displayName: 'Laboratori SCM',
      searchFields: ['codice', 'nome', 'accessCode'],
    },
    scmLaunch: {
      model: 'scmLaunch',
      displayName: 'Lanci SCM',
      searchFields: ['numero', 'stato', 'note'],
    },
    scmLaunchArticle: {
      model: 'scmLaunchArticle',
      displayName: 'Articoli Lanci',
      searchFields: ['commessa', 'modello', 'colore'],
    },
    scmLaunchPhase: {
      model: 'scmLaunchPhase',
      displayName: 'Fasi Lanci',
      searchFields: ['nome', 'stato', 'note'],
    },
    scmStandardPhase: {
      model: 'scmStandardPhase',
      displayName: 'Fasi Standard',
      searchFields: ['nome', 'codice', 'descrizione'],
    },
    scmProgressTracking: {
      model: 'scmProgressTracking',
      displayName: 'Tracking Progressi',
      searchFields: ['note'],
    },
    scmSetting: {
      model: 'scmSetting',
      displayName: 'Impostazioni SCM',
      searchFields: ['key', 'value'],
    },

    // MRP Module (mrp_)
    mrpMaterial: {
      model: 'mrpMaterial',
      displayName: 'Materiali',
      searchFields: ['codice', 'nome', 'fornitore'],
    },
    mrpCategory: {
      model: 'mrpCategory',
      displayName: 'Categorie Materiali',
      searchFields: ['nome', 'codice', 'descrizione'],
    },
    mrpOrder: {
      model: 'mrpOrder',
      displayName: 'Ordini Materiali',
      searchFields: ['fornitore', 'riferimento', 'stato'],
    },
    mrpArrival: {
      model: 'mrpArrival',
      displayName: 'Arrivi Materiali',
      searchFields: ['riferimento', 'note'],
    },
    mrpRequirement: {
      model: 'mrpRequirement',
      displayName: 'Fabbisogni Materiali',
      searchFields: ['commessa', 'stato', 'note'],
    },

    // Cron Jobs Module
    cronLog: {
      model: 'cronLog',
      displayName: 'Log Cron Jobs',
      searchFields: ['jobClass', 'name', 'status'],
    },

    // InWork Module (inwork_)
    inworkOperator: {
      model: 'inworkOperator',
      displayName: 'Operatori InWork',
      searchFields: ['nome', 'cognome', 'matricola', 'reparto'],
    },
    inworkModulePermission: {
      model: 'inworkModulePermission',
      displayName: 'Permessi Moduli InWork',
      searchFields: ['module'],
    },
    inworkAvailableModule: {
      model: 'inworkAvailableModule',
      displayName: 'Moduli Disponibili InWork',
      searchFields: ['moduleId', 'moduleName', 'descrizione'],
    },

    // Analitiche Module (ana_)
    analiticaRecord: {
      model: 'analiticaRecord',
      displayName: 'Record Analitiche',
      searchFields: ['tipoDocumento', 'numeroDocumento', 'linea', 'articolo', 'descrizioneArt', 'tipologiaOrdine'],
    },
    analiticaReparto: {
      model: 'analiticaReparto',
      displayName: 'Reparti Analitiche',
      searchFields: ['nome', 'codice', 'descrizione'],
    },
    analiticaImport: {
      model: 'analiticaImport',
      displayName: 'Import Analitiche',
      searchFields: ['fileName', 'stato'],
    },
  };

  getAvailableTables() {
    return Object.entries(this.managedTables).map(([key, value]) => ({
      name: key,
      displayName: value.displayName,
      model: value.model,
    }));
  }

  getTableSchema(tableName: string) {
    const tableConfig = this.managedTables[tableName];
    if (!tableConfig) {
      throw new BadRequestException('Tabella non gestibile');
    }

    // Qui puoi restituire lo schema dettagliato dei campi
    // Per ora ritorniamo i campi di ricerca
    return {
      name: tableName,
      displayName: tableConfig.displayName,
      searchFields: tableConfig.searchFields,
    };
  }

  async getTableData(tableName: string, options: QueryOptions) {
    const tableConfig = this.managedTables[tableName];
    if (!tableConfig) {
      throw new BadRequestException('Tabella non gestibile');
    }

    const { page, limit, search, sortBy, sortOrder } = options;
    const skip = (page - 1) * limit;

    // Costruisci la query di ricerca
    const where: any = {};
    if (search && tableConfig.searchFields.length > 0) {
      where.OR = tableConfig.searchFields.map(field => ({
        [field]: { contains: search, mode: 'insensitive' },
      }));
    }

    // Costruisci l'ordinamento - usa primaryKey se disponibile, altrimenti 'id'
    const defaultSortField = tableConfig.primaryKey || 'id';

    // Helper per tentare una query con un dato orderBy e fallare silenziosamente
    const tryQuery = async (orderBy: any) => {
      return Promise.all([
        (this.prisma as any)[tableConfig.model].findMany({ where, orderBy, skip, take: limit }),
        (this.prisma as any)[tableConfig.model].count({ where }),
      ]);
    };

    try {
      // Se sortBy è specificato, prova prima con quel campo; se Prisma lancia (campo non esistente),
      // ripiega sul campo primario di default
      let data: any[], total: number;
      if (sortBy && sortBy !== '') {
        try {
          [data, total] = await tryQuery({ [sortBy]: sortOrder });
        } catch {
          [data, total] = await tryQuery({ [defaultSortField]: 'desc' });
        }
      } else {
        [data, total] = await tryQuery({ [defaultSortField]: 'desc' });
      }

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new BadRequestException(`Errore recupero dati: ${error.message}`);
    }
  }

  private parseId(id: string, idType?: string): string | number {
    if (idType === 'string') {
      return id; // UUID o altra stringa
    }
    return parseInt(id, 10); // Default: numero intero
  }

  async getRecord(tableName: string, id: string) {
    const tableConfig = this.managedTables[tableName];
    if (!tableConfig) {
      throw new BadRequestException('Tabella non gestibile');
    }

    try {
      const parsedId = this.parseId(id, tableConfig.idType);
      const pkField = tableConfig.primaryKey || 'id';
      const record = await (this.prisma as any)[tableConfig.model].findUnique({
        where: { [pkField]: parsedId },
      });

      if (!record) {
        throw new NotFoundException('Record non trovato');
      }

      return record;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(`Errore recupero record: ${error.message}`);
    }
  }

  private sanitizeUpdateData(data: any, tableName: string): any {
    const sanitized: any = {};
    const tableConfig = this.managedTables[tableName];
    const noConvertFields = tableConfig?.noConvert || [];

    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        sanitized[key] = value;
        continue;
      }

      // Se il campo è nella lista noConvert, mantienilo come stringa
      if (noConvertFields.includes(key)) {
        sanitized[key] = value;
        continue;
      }

      // Se è una stringa, prova a convertirla nel tipo appropriato
      if (typeof value === 'string') {
        // Boolean
        if (value === 'true' || value === '1') {
          sanitized[key] = true;
        } else if (value === 'false' || value === '0') {
          sanitized[key] = false;
        }
        // Numero intero
        else if (/^\d+$/.test(value)) {
          sanitized[key] = parseInt(value, 10);
        }
        // Numero decimale
        else if (/^\d+\.\d+$/.test(value)) {
          sanitized[key] = parseFloat(value);
        }
        // Stringa normale
        else {
          sanitized[key] = value;
        }
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  async updateRecord(tableName: string, id: string, data: any, userId: number) {
    const tableConfig = this.managedTables[tableName];
    if (!tableConfig) {
      throw new BadRequestException('Tabella non gestibile');
    }

    try {
      // Rimuovi campi non aggiornabili (rimuovi sia 'id' che il primaryKey custom se presente)
      const pkField = tableConfig.primaryKey || 'id';
      const { id: _, createdAt, [pkField]: __, ...rawUpdateData } = data;

      // Sanitizza i dati per convertire i tipi correttamente
      const updateData = this.sanitizeUpdateData(rawUpdateData, tableName);

      const parsedId = this.parseId(id, tableConfig.idType);
      const updated = await (this.prisma as any)[tableConfig.model].update({
        where: { [pkField]: parsedId },
        data: updateData,
      });

      // Log dell'operazione
      await this.logOperation({
        userId,
        tableName,
        recordId: id,
        operation: 'UPDATE',
        oldData: data,
        newData: updated,
      });

      return updated;
    } catch (error) {
      throw new BadRequestException(`Errore aggiornamento record: ${error.message}`);
    }
  }

  async deleteRecord(tableName: string, id: string, userId: number) {
    const tableConfig = this.managedTables[tableName];
    if (!tableConfig) {
      throw new BadRequestException('Tabella non gestibile');
    }

    try {
      const parsedId = this.parseId(id, tableConfig.idType);
      const pkField = tableConfig.primaryKey || 'id';
      const record = await (this.prisma as any)[tableConfig.model].findUnique({
        where: { [pkField]: parsedId },
      });

      if (!record) {
        throw new NotFoundException('Record non trovato');
      }

      await (this.prisma as any)[tableConfig.model].delete({
        where: { [pkField]: parsedId },
      });

      // Log dell'operazione
      await this.logOperation({
        userId,
        tableName,
        recordId: id,
        operation: 'DELETE',
        oldData: record,
        newData: null,
      });

      return { success: true, message: 'Record eliminato' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(`Errore eliminazione record: ${error.message}`);
    }
  }

  private async logOperation(params: {
    userId: number;
    tableName: string;
    recordId: string;
    operation: string;
    oldData?: any;
    newData?: any;
  }) {
    try {
      await this.prisma.activityLog.create({
        data: {
          userId: params.userId,
          action: `DATA_MANAGEMENT_${params.operation}`,
          description: `${params.operation} su ${params.tableName} (ID: ${params.recordId})`,
          metadata: {
            tableName: params.tableName,
            recordId: params.recordId,
            oldData: params.oldData,
            newData: params.newData,
          },
        },
      });
    } catch (error) {
      console.error('Errore logging operazione:', error);
    }
  }

  /**
   * Esegue una query SQL raw (tutte le operazioni consentite — modulo admin only).
   * Accesso già protetto da @RequirePermissions('dbsql') nel controller.
   */
  async executeSql(sql: string, userId: number): Promise<{ columns: string[]; rows: any[][]; rowCount: number; duration: number; affected?: number }> {
    const start = Date.now();
    try {
      const result = await this.prisma.$queryRawUnsafe(sql) as any;
      const duration = Date.now() - start;

      // Audit log
      await this.logOperation({ userId, tableName: 'SQL_CONSOLE', recordId: '0', operation: 'SQL', oldData: { sql } });

      // $queryRawUnsafe per DML restituisce un oggetto { count: N } o simile
      if (!Array.isArray(result)) {
        const affected = result?.count ?? result?.affectedRows ?? 0;
        return { columns: ['affected_rows'], rows: [[Number(affected)]], rowCount: 1, duration, affected: Number(affected) };
      }

      if (result.length === 0) {
        return { columns: [], rows: [], rowCount: 0, duration };
      }

      const columns = Object.keys(result[0]);
      const rows = result.map((r: any) => columns.map(c => {
        const v = r[c];
        if (v === null || v === undefined) return null;
        if (v instanceof Date) return v.toISOString();
        if (typeof v === 'bigint') return Number(v);
        if (typeof v === 'object') return JSON.stringify(v);
        return v;
      }));

      return { columns, rows, rowCount: rows.length, duration };
    } catch (error) {
      throw new BadRequestException(`Errore SQL: ${error.message}`);
    }
  }

  /**
   * Restituisce la lista delle tabelle fisiche nel database con row count
   */
  async getDatabaseTables(): Promise<{ table: string; rows: number; size: string }[]> {
    try {
      const result: any[] = await this.prisma.$queryRaw`
        SELECT
          TABLE_NAME as \`table\`,
          TABLE_ROWS as \`rows\`,
          ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024, 1) as size_kb
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
        ORDER BY TABLE_NAME
      `;
      return result.map(r => ({
        table: r.table,
        rows: Number(r.rows ?? 0),
        size: `${r.size_kb ?? 0} KB`,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Restituisce le colonne di una tabella fisica
   */
  async getTableColumns(tableName: string): Promise<{ field: string; type: string; null: string; key: string; default: any; extra: string }[]> {
    // Sanity check: solo caratteri alfanumerici e underscore
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new BadRequestException('Nome tabella non valido');
    }
    try {
      const result: any[] = await this.prisma.$queryRawUnsafe(`DESCRIBE \`${tableName}\``);
      return result.map(r => ({
        field: r.Field,
        type: r.Type,
        null: r.Null,
        key: r.Key,
        default: r.Default,
        extra: r.Extra,
      }));
    } catch (error) {
      throw new BadRequestException(`Tabella non trovata: ${tableName}`);
    }
  }

  async getAuditLog(options: AuditLogOptions) {
    const { page, limit, tableName } = options;
    const skip = (page - 1) * limit;

    const where: any = {
      action: { startsWith: 'DATA_MANAGEMENT_' },
    };

    if (tableName) {
      where.metadata = {
        path: ['tableName'],
        equals: tableName,
      };
    }

    try {
      const [logs, total] = await Promise.all([
        this.prisma.activityLog.findMany({
          where,
          include: { user: { select: { nome: true, userName: true } } },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.activityLog.count({ where }),
      ]);

      return {
        data: logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new BadRequestException(`Errore recupero audit log: ${error.message}`);
    }
  }
}
