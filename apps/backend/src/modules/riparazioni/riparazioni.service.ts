import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class RiparazioniService {
  constructor(private prisma: PrismaService) {}

  // ==================== RIPARAZIONI ESTERNE ====================

  /**
   * Get all riparazioni with filters
   */
  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.RiparazioneWhereInput;
    orderBy?: Prisma.RiparazioneOrderByWithRelationInput;
    include?: Prisma.RiparazioneInclude;
  }) {
    const { skip, take, where, orderBy, include } = params || {};

    const [data, total] = await Promise.all([
      this.prisma.riparazione.findMany({
        skip,
        take,
        where,
        orderBy,
        include: include || {
          user: { select: { id: true, nome: true, userName: true } },
          laboratorio: true,
          reparto: true,
          linea: true,
          numerata: true,
        },
      }),
      this.prisma.riparazione.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Get single riparazione by ID
   */
  async findOne(id: number) {
    const riparazione = await this.prisma.riparazione.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, nome: true, userName: true } },
        laboratorio: true,
        reparto: true,
        linea: true,
        numerata: true,
      },
    });

    if (!riparazione) {
      throw new NotFoundException(`Riparazione con ID ${id} non trovata`);
    }

    return riparazione;
  }

  /**
   * Get riparazione by idRiparazione (custom ID)
   */
  async findByIdRiparazione(idRiparazione: string) {
    const riparazione = await this.prisma.riparazione.findUnique({
      where: { idRiparazione },
      include: {
        user: { select: { id: true, nome: true, userName: true } },
        laboratorio: true,
        reparto: true,
        linea: true,
        numerata: true,
      },
    });

    if (!riparazione) {
      throw new NotFoundException(`Riparazione ${idRiparazione} non trovata`);
    }

    return riparazione;
  }

  /**
   * Generate next idRiparazione
   */
  async generateNextIdRiparazione(): Promise<string> {
    const lastRiparazione = await this.prisma.riparazione.findFirst({
      orderBy: { id: 'desc' },
      select: { idRiparazione: true },
    });

    if (!lastRiparazione) {
      return '000001';
    }

    // Extract number from idRiparazione (e.g., "000123" -> 123)
    const lastNumber = parseInt(lastRiparazione.idRiparazione, 10);
    const nextNumber = lastNumber + 1;

    // Pad with zeros (6 digits)
    return nextNumber.toString().padStart(6, '0');
  }

  /**
   * Create new riparazione
   */
  async create(data: Prisma.RiparazioneCreateInput) {
    // Auto-generate idRiparazione if not provided
    if (!data.idRiparazione) {
      const idRiparazione = await this.generateNextIdRiparazione();
      data.idRiparazione = idRiparazione;
    }

    // Calculate qtaTotale from p01-p20
    const qtaTotale = this.calculateQtaTotale(data);
    data.qtaTotale = qtaTotale;

    return this.prisma.riparazione.create({
      data,
      include: {
        user: { select: { id: true, nome: true, userName: true } },
        laboratorio: true,
        reparto: true,
        linea: true,
        numerata: true,
      },
    });
  }

  /**
   * Update riparazione
   */
  async update(id: number, data: Prisma.RiparazioneUpdateInput) {
    // Recalculate qtaTotale if any p01-p20 changed
    const qtaTotale = this.calculateQtaTotale(data);
    if (qtaTotale !== undefined) {
      data.qtaTotale = qtaTotale;
    }

    return this.prisma.riparazione.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, nome: true, userName: true } },
        laboratorio: true,
        reparto: true,
        linea: true,
        numerata: true,
      },
    });
  }

  /**
   * Complete riparazione
   */
  async complete(id: number) {
    return this.prisma.riparazione.update({
      where: { id },
      data: {
        completa: true,
        dataChiusura: new Date(),
      },
      include: {
        user: { select: { id: true, nome: true, userName: true } },
        laboratorio: true,
        reparto: true,
        linea: true,
        numerata: true,
      },
    });
  }

  /**
   * Delete riparazione
   */
  async remove(id: number) {
    // Check if completed (optional business rule)
    const riparazione = await this.findOne(id);
    if (riparazione.completa) {
      throw new BadRequestException('Non puoi eliminare una riparazione completata');
    }

    return this.prisma.riparazione.delete({
      where: { id },
    });
  }

  /**
   * Get dashboard statistics
   */
  async getStats() {
    const [
      totale,
      aperte,
      completate,
      byLaboratorio,
      byReparto,
      recent,
    ] = await Promise.all([
      this.prisma.riparazione.count(),
      this.prisma.riparazione.count({ where: { completa: false } }),
      this.prisma.riparazione.count({ where: { completa: true } }),
      this.prisma.riparazione.groupBy({
        by: ['laboratorioId'],
        where: { completa: false, laboratorioId: { not: null } },
        _count: true,
        orderBy: { _count: { laboratorioId: 'desc' } },
        take: 5,
      }),
      this.prisma.riparazione.groupBy({
        by: ['repartoId'],
        where: { completa: false, repartoId: { not: null } },
        _count: true,
        orderBy: { _count: { repartoId: 'desc' } },
        take: 5,
      }),
      this.prisma.riparazione.findMany({
        take: 10,
        orderBy: { data: 'desc' },
        include: {
          laboratorio: { select: { nome: true } },
          reparto: { select: { nome: true } },
        },
      }),
    ]);

    return {
      totale,
      aperte,
      completate,
      byLaboratorio,
      byReparto,
      recent,
    };
  }

  // ==================== RIPARAZIONI INTERNE ====================

  /**
   * Get all riparazioni interne with filters
   */
  async findAllInterne(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.RiparazioneInternaWhereInput;
    orderBy?: Prisma.RiparazioneInternaOrderByWithRelationInput;
    include?: Prisma.RiparazioneInternaInclude;
  }) {
    const { skip, take, where, orderBy, include } = params || {};

    const [data, total] = await Promise.all([
      this.prisma.riparazioneInterna.findMany({
        skip,
        take,
        where,
        orderBy,
        include: include || {
          user: { select: { id: true, nome: true, userName: true } },
          numerata: true,
        },
      }),
      this.prisma.riparazioneInterna.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Get single riparazione interna by ID
   */
  async findOneInterna(id: number) {
    const riparazione = await this.prisma.riparazioneInterna.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, nome: true, userName: true } },
        numerata: true,
      },
    });

    if (!riparazione) {
      throw new NotFoundException(`Riparazione interna con ID ${id} non trovata`);
    }

    return riparazione;
  }

  /**
   * Generate next idRiparazione for riparazioni interne
   */
  async generateNextIdRiparazioneInterna(): Promise<string> {
    const lastRiparazione = await this.prisma.riparazioneInterna.findFirst({
      orderBy: { id: 'desc' },
      select: { idRiparazione: true },
    });

    if (!lastRiparazione) {
      return 'INT000001';
    }

    // Extract number from idRiparazione (e.g., "INT000123" -> 123)
    const match = lastRiparazione.idRiparazione.match(/INT(\d+)/);
    const lastNumber = match ? parseInt(match[1], 10) : 0;
    const nextNumber = lastNumber + 1;

    // Pad with zeros (6 digits) and add INT prefix
    return 'INT' + nextNumber.toString().padStart(6, '0');
  }

  /**
   * Create new riparazione interna
   */
  async createInterna(data: Prisma.RiparazioneInternaCreateInput) {
    // Auto-generate idRiparazione if not provided
    if (!data.idRiparazione) {
      const idRiparazione = await this.generateNextIdRiparazioneInterna();
      data.idRiparazione = idRiparazione;
    }

    // Calculate qtaTotale from p01-p20
    const qtaTotale = this.calculateQtaTotale(data);
    data.qtaTotale = qtaTotale;

    return this.prisma.riparazioneInterna.create({
      data,
      include: {
        user: { select: { id: true, nome: true, userName: true } },
        numerata: true,
      },
    });
  }

  /**
   * Update riparazione interna
   */
  async updateInterna(id: number, data: Prisma.RiparazioneInternaUpdateInput) {
    // Recalculate qtaTotale if any p01-p20 changed
    const qtaTotale = this.calculateQtaTotale(data);
    if (qtaTotale !== undefined) {
      data.qtaTotale = qtaTotale;
    }

    return this.prisma.riparazioneInterna.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, nome: true, userName: true } },
        numerata: true,
      },
    });
  }

  /**
   * Complete riparazione interna
   */
  async completeInterna(id: number, operatoreChiusura?: string) {
    return this.prisma.riparazioneInterna.update({
      where: { id },
      data: {
        completa: true,
        dataChiusura: new Date(),
        operatoreChiusura,
      },
      include: {
        user: { select: { id: true, nome: true, userName: true } },
        numerata: true,
      },
    });
  }

  /**
   * Delete riparazione interna
   */
  async removeInterna(id: number) {
    // Check if completed (optional business rule)
    const riparazione = await this.findOneInterna(id);
    if (riparazione.completa) {
      throw new BadRequestException('Non puoi eliminare una riparazione interna completata');
    }

    return this.prisma.riparazioneInterna.delete({
      where: { id },
    });
  }

  /**
   * Get dashboard statistics for riparazioni interne
   */
  async getStatsInterne() {
    const [
      totale,
      aperte,
      completate,
      byRepartoOrigine,
      byRepartoDestino,
      recent,
    ] = await Promise.all([
      this.prisma.riparazioneInterna.count(),
      this.prisma.riparazioneInterna.count({ where: { completa: false } }),
      this.prisma.riparazioneInterna.count({ where: { completa: true } }),
      this.prisma.riparazioneInterna.groupBy({
        by: ['repartoOrigine'],
        where: { completa: false, repartoOrigine: { not: null } },
        _count: true,
        orderBy: { _count: { repartoOrigine: 'desc' } },
        take: 5,
      }),
      this.prisma.riparazioneInterna.groupBy({
        by: ['repartoDestino'],
        where: { completa: false, repartoDestino: { not: null } },
        _count: true,
        orderBy: { _count: { repartoDestino: 'desc' } },
        take: 5,
      }),
      this.prisma.riparazioneInterna.findMany({
        take: 10,
        orderBy: { data: 'desc' },
      }),
    ]);

    return {
      totale,
      aperte,
      completate,
      byRepartoOrigine,
      byRepartoDestino,
      recent,
    };
  }

  // ==================== SUPPORT DATA ====================

  /**
   * Get all reparti
   */
  async findAllReparti() {
    return this.prisma.reparto.findMany({
      where: { attivo: true },
      orderBy: { ordine: 'asc' },
    });
  }

  /**
   * Get all laboratori
   */
  async findAllLaboratori() {
    return this.prisma.laboratorio.findMany({
      where: { attivo: true },
      orderBy: { nome: 'asc' },
    });
  }

  /**
   * Get all linee
   */
  async findAllLinee() {
    return this.prisma.linea.findMany({
      where: { attivo: true },
      orderBy: { ordine: 'asc' },
    });
  }

  /**
   * Get all numerate
   */
  async findAllNumerate() {
    return this.prisma.numerata.findMany({
      orderBy: { id: 'asc' },
    });
  }

  /**
   * Get numerata by ID
   */
  async findNumerata(id: number) {
    const numerata = await this.prisma.numerata.findUnique({
      where: { id },
    });

    if (!numerata) {
      throw new NotFoundException(`Numerata con ID ${id} non trovata`);
    }

    return numerata;
  }

  // ==================== HELPER FUNCTIONS ====================

  /**
   * Calculate qtaTotale from p01-p20 fields
   */
  private calculateQtaTotale(data: any): number | undefined {
    const pFields = ['p01', 'p02', 'p03', 'p04', 'p05', 'p06', 'p07', 'p08', 'p09', 'p10',
                     'p11', 'p12', 'p13', 'p14', 'p15', 'p16', 'p17', 'p18', 'p19', 'p20'];

    let hasAnyPField = false;
    let total = 0;

    for (const field of pFields) {
      if (data[field] !== undefined && data[field] !== null) {
        hasAnyPField = true;
        total += Number(data[field]) || 0;
      }
    }

    return hasAnyPField ? total : undefined;
  }
}
