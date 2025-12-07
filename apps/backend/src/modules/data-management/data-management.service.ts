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
    riparazioni: {
      model: 'riparazione',
      displayName: 'Riparazioni',
      searchFields: ['numero', 'descrizione', 'cliente'],
    },
    produzione: {
      model: 'numerata',
      displayName: 'Produzione',
      searchFields: ['numero', 'articolo', 'descrizione'],
    },
    quality: {
      model: 'qualityRecord',
      displayName: 'Quality Control',
      searchFields: ['numerata', 'note'],
    },
    export: {
      model: 'exportDocument',
      displayName: 'Export/DDT',
      searchFields: ['progressivo', 'cliente', 'destinazione'],
    },
    users: {
      model: 'user',
      displayName: 'Utenti',
      searchFields: ['userName', 'nome', 'mail'],
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

    // Costruisci l'ordinamento
    const orderBy: any = sortBy ? { [sortBy]: sortOrder } : { id: 'desc' };

    try {
      const [data, total] = await Promise.all([
        this.prisma[tableConfig.model].findMany({
          where,
          orderBy,
          skip,
          take: limit,
        }),
        this.prisma[tableConfig.model].count({ where }),
      ]);

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

  async getRecord(tableName: string, id: string) {
    const tableConfig = this.managedTables[tableName];
    if (!tableConfig) {
      throw new BadRequestException('Tabella non gestibile');
    }

    try {
      const record = await this.prisma[tableConfig.model].findUnique({
        where: { id: parseInt(id, 10) },
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

  async updateRecord(tableName: string, id: string, data: any, userId: number) {
    const tableConfig = this.managedTables[tableName];
    if (!tableConfig) {
      throw new BadRequestException('Tabella non gestibile');
    }

    try {
      // Rimuovi campi non aggiornabili
      const { id: _, createdAt, ...updateData } = data;

      const updated = await this.prisma[tableConfig.model].update({
        where: { id: parseInt(id, 10) },
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
      const record = await this.prisma[tableConfig.model].findUnique({
        where: { id: parseInt(id, 10) },
      });

      if (!record) {
        throw new NotFoundException('Record non trovato');
      }

      await this.prisma[tableConfig.model].delete({
        where: { id: parseInt(id, 10) },
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
