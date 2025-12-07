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
   * Get cartellino data from core_dati
   */
  async getCartellinoData(cartellino: string) {
    const cartelNum = parseInt(cartellino);
    if (isNaN(cartelNum)) {
      throw new NotFoundException('Cartellino non valido');
    }

    const record = await this.prisma.coreData.findFirst({
      where: { cartel: cartelNum },
    });

    if (!record) {
      throw new NotFoundException('Cartellino non trovato');
    }

    // Trova la numerata corrispondente al campo nu (se presente)
    let numerata = null;
    if (record.nu) {
      numerata = await this.prisma.numerata.findUnique({
        where: { idNumerata: record.nu },
      });
    }

    return {
      codiceArticolo: record.articolo,
      descrizione: record.descrizioneArticolo,
      cartellino: record.cartel?.toString(),
      commessa: record.commessaCli,
      ragioneSociale: record.ragioneSociale,
      totale: record.tot,
      numerataId: numerata?.id || null,
      nu: record.nu || null, // Include NU from core_dati for redirect purposes
      // Include le quantità per taglia dal core_dati
      p01: record.p01 || 0,
      p02: record.p02 || 0,
      p03: record.p03 || 0,
      p04: record.p04 || 0,
      p05: record.p05 || 0,
      p06: record.p06 || 0,
      p07: record.p07 || 0,
      p08: record.p08 || 0,
      p09: record.p09 || 0,
      p10: record.p10 || 0,
      p11: record.p11 || 0,
      p12: record.p12 || 0,
      p13: record.p13 || 0,
      p14: record.p14 || 0,
      p15: record.p15 || 0,
      p16: record.p16 || 0,
      p17: record.p17 || 0,
      p18: record.p18 || 0,
      p19: record.p19 || 0,
      p20: record.p20 || 0,
    };
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

  /**
   * Create laboratorio
   */
  async createLaboratorio(data: Prisma.LaboratorioCreateInput) {
    return this.prisma.laboratorio.create({ data });
  }

  /**
   * Update laboratorio
   */
  async updateLaboratorio(id: number, data: Prisma.LaboratorioUpdateInput) {
    return this.prisma.laboratorio.update({ where: { id }, data });
  }

  /**
   * Delete laboratorio
   */
  async deleteLaboratorio(id: number) {
    return this.prisma.laboratorio.delete({ where: { id } });
  }

  /**
   * Create reparto
   */
  async createReparto(data: Prisma.RepartoCreateInput) {
    return this.prisma.reparto.create({ data });
  }

  /**
   * Update reparto
   */
  async updateReparto(id: number, data: Prisma.RepartoUpdateInput) {
    return this.prisma.reparto.update({ where: { id }, data });
  }

  /**
   * Delete reparto
   */
  async deleteReparto(id: number) {
    return this.prisma.reparto.delete({ where: { id } });
  }

  /**
   * Create numerata
   */
  async createNumerata(data: Prisma.NumerataCreateInput) {
    return this.prisma.numerata.create({ data });
  }

  /**
   * Update numerata
   */
  async updateNumerata(id: number, data: Prisma.NumerataUpdateInput) {
    return this.prisma.numerata.update({ where: { id }, data });
  }

  /**
   * Delete numerata
   */
  async deleteNumerata(id: number) {
    return this.prisma.numerata.delete({ where: { id } });
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
