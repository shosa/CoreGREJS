import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnaliticheService {
  constructor(private prisma: PrismaService) {}

  // ==================== STATS ====================

  async getStats() {
    const [totalRecords, totalImports, repartiCount] = await Promise.all([
      this.prisma.analiticaRecord.count(),
      this.prisma.analiticaImport.count(),
      this.prisma.analiticaReparto.count({ where: { attivo: true } }),
    ]);

    // Statistiche per tipo documento
    const recordsByTipo = await this.prisma.analiticaRecord.groupBy({
      by: ['tipoDocumento'],
      _count: { id: true },
    });

    return {
      totalRecords,
      totalImports,
      repartiCount,
      recordsByTipo,
    };
  }

  // ==================== RECORDS ====================

  async getRecords(filters?: {
    search?: string;
    tipoDocumento?: string;
    linea?: string;
    dataFrom?: string;
    dataTo?: string;
    prodottoEstero?: boolean | null;
    repartoId?: number;
    importId?: number;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.search) {
      where.OR = [
        { articolo: { contains: filters.search } },
        { descrizioneArt: { contains: filters.search } },
        { linea: { contains: filters.search } },
      ];
    }

    if (filters?.tipoDocumento) {
      where.tipoDocumento = filters.tipoDocumento;
    }

    if (filters?.linea) {
      where.linea = filters.linea;
    }

    if (filters?.dataFrom || filters?.dataTo) {
      where.dataDocumento = {};
      if (filters?.dataFrom) {
        where.dataDocumento.gte = new Date(filters.dataFrom);
      }
      if (filters?.dataTo) {
        where.dataDocumento.lte = new Date(filters.dataTo);
      }
    }

    if (filters?.prodottoEstero !== undefined) {
      where.prodottoEstero = filters.prodottoEstero;
    }

    if (filters?.repartoId) {
      where.repartoId = filters.repartoId;
    }

    if (filters?.importId) {
      where.importId = filters.importId;
    }

    const [records, total] = await Promise.all([
      this.prisma.analiticaRecord.findMany({
        where,
        include: {
          reparto: true,
          repartoFinale: true,
          import: true,
        },
        orderBy: { dataDocumento: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.analiticaRecord.count({ where }),
    ]);

    return {
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getRecordById(id: number) {
    const record = await this.prisma.analiticaRecord.findUnique({
      where: { id },
      include: {
        reparto: true,
        repartoFinale: true,
        import: true,
      },
    });

    if (!record) {
      throw new NotFoundException(`Record con ID ${id} non trovato`);
    }

    return record;
  }

  async updateRecord(id: number, data: {
    prodottoEstero?: boolean | null;
    repartoId?: number | null;
    repartoFinaleId?: number | null;
    costoTaglio?: number | null;
    costoOrlatura?: number | null;
    costoStrobel?: number | null;
    altriCosti?: number | null;
    costoMontaggio?: number | null;
  }) {
    const record = await this.prisma.analiticaRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException(`Record con ID ${id} non trovato`);
    }

    return this.prisma.analiticaRecord.update({
      where: { id },
      data,
      include: {
        reparto: true,
        repartoFinale: true,
      },
    });
  }

  async deleteRecord(id: number) {
    const record = await this.prisma.analiticaRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException(`Record con ID ${id} non trovato`);
    }

    await this.prisma.analiticaRecord.delete({ where: { id } });
    return { success: true };
  }

  // ==================== REPARTI ====================

  // Helper per deserializzare costiAssociati
  private parseCostiAssociati(reparto: any) {
    if (reparto && reparto.costiAssociati) {
      try {
        reparto.costiAssociati = JSON.parse(reparto.costiAssociati);
      } catch {
        reparto.costiAssociati = [];
      }
    } else if (reparto) {
      reparto.costiAssociati = [];
    }
    return reparto;
  }

  async getReparti(onlyActive = true) {
    const where = onlyActive ? { attivo: true } : {};
    const reparti = await this.prisma.analiticaReparto.findMany({
      where,
      orderBy: [{ ordine: 'asc' }, { nome: 'asc' }],
    });
    return reparti.map(r => this.parseCostiAssociati(r));
  }

  async getRepartoById(id: number) {
    const reparto = await this.prisma.analiticaReparto.findUnique({
      where: { id },
    });

    if (!reparto) {
      throw new NotFoundException(`Reparto con ID ${id} non trovato`);
    }

    return this.parseCostiAssociati(reparto);
  }

  async createReparto(data: {
    nome: string;
    codice?: string;
    descrizione?: string;
    attivo?: boolean;
    ordine?: number;
    costiAssociati?: string[]; // array di chiavi costo: ["costoTaglio", "costoOrlatura", ...]
  }) {
    // Check unique codice if provided
    if (data.codice) {
      const existing = await this.prisma.analiticaReparto.findUnique({
        where: { codice: data.codice },
      });
      if (existing) {
        throw new BadRequestException(`Reparto con codice "${data.codice}" già esistente`);
      }
    }

    // Serializza costiAssociati come JSON string
    const createData: any = { ...data };
    if (data.costiAssociati) {
      createData.costiAssociati = JSON.stringify(data.costiAssociati);
    }

    return this.prisma.analiticaReparto.create({ data: createData });
  }

  async updateReparto(id: number, data: {
    nome?: string;
    codice?: string;
    descrizione?: string;
    attivo?: boolean;
    ordine?: number;
    costiAssociati?: string[]; // array di chiavi costo: ["costoTaglio", "costoOrlatura", ...]
  }) {
    const reparto = await this.prisma.analiticaReparto.findUnique({
      where: { id },
    });

    if (!reparto) {
      throw new NotFoundException(`Reparto con ID ${id} non trovato`);
    }

    // Check unique codice if changed
    if (data.codice && data.codice !== reparto.codice) {
      const existing = await this.prisma.analiticaReparto.findUnique({
        where: { codice: data.codice },
      });
      if (existing) {
        throw new BadRequestException(`Reparto con codice "${data.codice}" già esistente`);
      }
    }

    // Serializza costiAssociati come JSON string
    const updateData: any = { ...data };
    if (data.costiAssociati !== undefined) {
      updateData.costiAssociati = JSON.stringify(data.costiAssociati);
    }

    return this.prisma.analiticaReparto.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteReparto(id: number) {
    const reparto = await this.prisma.analiticaReparto.findUnique({
      where: { id },
    });

    if (!reparto) {
      throw new NotFoundException(`Reparto con ID ${id} non trovato`);
    }

    // Check if reparto is used
    const usedCount = await this.prisma.analiticaRecord.count({
      where: {
        OR: [{ repartoId: id }, { repartoFinaleId: id }],
      },
    });

    if (usedCount > 0) {
      throw new BadRequestException(
        `Impossibile eliminare: il reparto è utilizzato da ${usedCount} record`
      );
    }

    await this.prisma.analiticaReparto.delete({ where: { id } });
    return { success: true };
  }

  // ==================== IMPORTS ====================

  async getImports(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [imports, total] = await Promise.all([
      this.prisma.analiticaImport.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.analiticaImport.count(),
    ]);

    return {
      data: imports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getImportById(id: number) {
    const importRecord = await this.prisma.analiticaImport.findUnique({
      where: { id },
      include: {
        records: {
          take: 100,
          include: {
            reparto: true,
            repartoFinale: true,
          },
        },
      },
    });

    if (!importRecord) {
      throw new NotFoundException(`Import con ID ${id} non trovato`);
    }

    return importRecord;
  }

  async deleteImport(id: number) {
    const importRecord = await this.prisma.analiticaImport.findUnique({
      where: { id },
    });

    if (!importRecord) {
      throw new NotFoundException(`Import con ID ${id} non trovato`);
    }

    // Delete associated records first
    await this.prisma.analiticaRecord.deleteMany({
      where: { importId: id },
    });

    await this.prisma.analiticaImport.delete({ where: { id } });
    return { success: true };
  }

  // ==================== TIPI DOCUMENTO ====================

  async getTipiDocumento() {
    const result = await this.prisma.analiticaRecord.groupBy({
      by: ['tipoDocumento'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    return result
      .filter((r) => r.tipoDocumento)
      .map((r) => ({
        tipo: r.tipoDocumento,
        count: r._count.id,
      }));
  }

  // ==================== MAPPATURE REPARTI ====================

  async getMappings() {
    return this.prisma.analiticaRepartoMapping.findMany({
      include: {
        analiticaReparto: true,
        prodDepartment: {
          include: { phase: true },
        },
      },
      orderBy: [{ analiticaRepartoId: 'asc' }, { prodDepartmentId: 'asc' }],
    });
  }

  async upsertMappings(analiticaRepartoId: number, prodDepartmentIds: number[]) {
    // Verifica che il reparto analitica esista
    const reparto = await this.prisma.analiticaReparto.findUnique({ where: { id: analiticaRepartoId } });
    if (!reparto) throw new NotFoundException(`Reparto analitica ${analiticaRepartoId} non trovato`);

    // Verifica conflitti: dept già usati da un altro reparto analitica
    if (prodDepartmentIds.length > 0) {
      const conflitti = await this.prisma.analiticaRepartoMapping.findMany({
        where: {
          prodDepartmentId: { in: prodDepartmentIds },
          analiticaRepartoId: { not: analiticaRepartoId },
        },
        include: { analiticaReparto: true, prodDepartment: true },
      });
      if (conflitti.length > 0) {
        const nomi = conflitti.map(c => `"${c.prodDepartment.nome}" → "${c.analiticaReparto.nome}"`).join(', ');
        throw new BadRequestException(`Reparti produzione già assegnati ad altri reparti analitici: ${nomi}`);
      }
    }

    // Sostituisce in transaction
    await this.prisma.$transaction([
      this.prisma.analiticaRepartoMapping.deleteMany({ where: { analiticaRepartoId } }),
      ...(prodDepartmentIds.length > 0
        ? [this.prisma.analiticaRepartoMapping.createMany({
            data: prodDepartmentIds.map(prodDepartmentId => ({ analiticaRepartoId, prodDepartmentId })),
          })]
        : []),
    ]);
  }

  async getProdDepartments() {
    return this.prisma.productionDepartment.findMany({
      where: { attivo: true },
      include: { phase: true },
      orderBy: [{ phase: { ordine: 'asc' } }, { ordine: 'asc' }],
    });
  }

  // ==================== FILTRI DISTINTI ====================

  async getDistinctFilters() {
    const [tipiDocumento, linee, mesi] = await Promise.all([
      // Tipi documento distinti
      this.prisma.analiticaRecord.groupBy({
        by: ['tipoDocumento'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      // Linee distinte
      this.prisma.analiticaRecord.groupBy({
        by: ['linea'],
        _count: { id: true },
        orderBy: { linea: 'asc' },
      }),
      // Mesi distinti (da dataDocumento)
      this.prisma.$queryRaw<Array<{ mese: string; count: bigint }>>`
        SELECT DATE_FORMAT(data_documento, '%Y-%m') as mese, COUNT(*) as count
        FROM ana_records
        WHERE data_documento IS NOT NULL
        GROUP BY DATE_FORMAT(data_documento, '%Y-%m')
        ORDER BY mese DESC
      `,
    ]);

    return {
      tipiDocumento: tipiDocumento
        .filter((r) => r.tipoDocumento)
        .map((r) => ({ value: r.tipoDocumento, count: r._count.id })),
      linee: linee
        .filter((r) => r.linea)
        .map((r) => ({ value: r.linea, count: r._count.id })),
      mesi: mesi.map((r) => ({ value: r.mese, count: Number(r.count) })),
    };
  }
}
