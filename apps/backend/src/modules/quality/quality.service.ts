import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  CreateDefectTypeDto,
  UpdateDefectTypeDto,
  CreateRecordDto,
  FilterRecordsDto,
} from './dto';

@Injectable()
export class QualityService {
  constructor(private prisma: PrismaService) {}

  // ==================== DEPARTMENTS ====================

  async getAllDepartments() {
    return this.prisma.qualityDepartment.findMany({
      orderBy: { ordine: 'asc' },
    });
  }

  async getActiveDepartments() {
    return this.prisma.qualityDepartment.findMany({
      where: { attivo: true },
      orderBy: { ordine: 'asc' },
    });
  }

  async getDepartmentById(id: number) {
    const department = await this.prisma.qualityDepartment.findUnique({
      where: { id },
    });
    if (!department) {
      throw new NotFoundException(`Reparto con ID ${id} non trovato`);
    }
    return department;
  }

  async createDepartment(data: CreateDepartmentDto) {
    // Check if department name already exists
    const existing = await this.prisma.qualityDepartment.findUnique({
      where: { nomeReparto: data.nomeReparto },
    });
    if (existing) {
      throw new BadRequestException(`Reparto "${data.nomeReparto}" già esistente`);
    }

    return this.prisma.qualityDepartment.create({
      data: {
        nomeReparto: data.nomeReparto,
        attivo: data.attivo ?? true,
        ordine: data.ordine ?? 0,
      },
    });
  }

  async updateDepartment(id: number, data: UpdateDepartmentDto) {
    await this.getDepartmentById(id);

    // Check if name is being changed and if new name already exists
    if (data.nomeReparto) {
      const existing = await this.prisma.qualityDepartment.findFirst({
        where: {
          nomeReparto: data.nomeReparto,
          NOT: { id },
        },
      });
      if (existing) {
        throw new BadRequestException(`Reparto "${data.nomeReparto}" già esistente`);
      }
    }

    return this.prisma.qualityDepartment.update({
      where: { id },
      data,
    });
  }

  async deleteDepartment(id: number) {
    await this.getDepartmentById(id);
    return this.prisma.qualityDepartment.delete({
      where: { id },
    });
  }

  // ==================== DEFECT TYPES ====================

  async getAllDefectTypes() {
    return this.prisma.qualityDefectType.findMany({
      orderBy: { ordine: 'asc' },
    });
  }

  async getActiveDefectTypes() {
    return this.prisma.qualityDefectType.findMany({
      where: { attivo: true },
      orderBy: { ordine: 'asc' },
    });
  }

  async getDefectTypeById(id: number) {
    const defectType = await this.prisma.qualityDefectType.findUnique({
      where: { id },
    });
    if (!defectType) {
      throw new NotFoundException(`Tipo difetto con ID ${id} non trovato`);
    }
    return defectType;
  }

  async createDefectType(data: CreateDefectTypeDto) {
    // Check if defect type description already exists
    const existing = await this.prisma.qualityDefectType.findUnique({
      where: { descrizione: data.descrizione },
    });
    if (existing) {
      throw new BadRequestException(`Tipo difetto "${data.descrizione}" già esistente`);
    }

    return this.prisma.qualityDefectType.create({
      data: {
        descrizione: data.descrizione,
        categoria: data.categoria,
        attivo: data.attivo ?? true,
        ordine: data.ordine ?? 0,
      },
    });
  }

  async updateDefectType(id: number, data: UpdateDefectTypeDto) {
    await this.getDefectTypeById(id);

    // Check if description is being changed and if new description already exists
    if (data.descrizione) {
      const existing = await this.prisma.qualityDefectType.findFirst({
        where: {
          descrizione: data.descrizione,
          NOT: { id },
        },
      });
      if (existing) {
        throw new BadRequestException(`Tipo difetto "${data.descrizione}" già esistente`);
      }
    }

    return this.prisma.qualityDefectType.update({
      where: { id },
      data,
    });
  }

  async deleteDefectType(id: number) {
    await this.getDefectTypeById(id);

    // Check if defect type is being used in exceptions
    const usageCount = await this.prisma.qualityException.count({
      where: { tipoDifetto: String(id) },
    });

    if (usageCount > 0) {
      throw new BadRequestException(
        `Impossibile eliminare: tipo difetto utilizzato in ${usageCount} eccezioni`
      );
    }

    return this.prisma.qualityDefectType.delete({
      where: { id },
    });
  }

  // ==================== OPERATORS ====================

  async getAllOperators() {
    return this.prisma.inworkOperator.findMany({
      where: { attivo: true },
      orderBy: { nome: 'asc' },
      select: {
        id: true,
        nome: true,
        cognome: true,
        matricola: true,
        reparto: true,
        email: true,
      },
    });
  }

  async getOperatorByUsername(username: string) {
    return this.prisma.inworkOperator.findFirst({
      where: { matricola: username },
    });
  }

  async authenticateOperator(username: string, pin: string) {
    const operator = await this.prisma.inworkOperator.findFirst({
      where: {
        matricola: username,
        attivo: true,
      },
    });

    if (!operator) {
      throw new NotFoundException('Operatore non trovato');
    }

    if (operator.pin !== pin) {
      throw new BadRequestException('PIN non corretto');
    }

    return {
      id: operator.id,
      nome: operator.nome,
      cognome: operator.cognome,
      matricola: operator.matricola,
      reparto: operator.reparto,
    };
  }

  // ==================== QUALITY RECORDS ====================

  async getAllRecords(filters?: FilterRecordsDto) {
    const where: any = {};

    if (filters?.dataInizio || filters?.dataFine) {
      where.dataControllo = {};
      if (filters.dataInizio) {
        where.dataControllo.gte = new Date(filters.dataInizio);
      }
      if (filters.dataFine) {
        const endDate = new Date(filters.dataFine);
        endDate.setHours(23, 59, 59, 999);
        where.dataControllo.lte = endDate;
      }
    }

    if (filters?.reparto) {
      where.reparto = filters.reparto;
    }

    if (filters?.operatore) {
      where.operatore = filters.operatore;
    }

    if (filters?.tipoCq) {
      where.tipoCq = filters.tipoCq;
    }

    return this.prisma.qualityRecord.findMany({
      where,
      include: {
        exceptions: {
          orderBy: { dataCreazione: 'asc' },
        },
      },
      orderBy: { dataControllo: 'desc' },
    });
  }

  async getRecordById(id: number) {
    const record = await this.prisma.qualityRecord.findUnique({
      where: { id },
      include: {
        exceptions: {
          orderBy: { dataCreazione: 'asc' },
        },
      },
    });

    if (!record) {
      throw new NotFoundException(`Record con ID ${id} non trovato`);
    }

    return record;
  }

  async createRecord(data: CreateRecordDto) {
    // Verify cartellino exists in core_data
    const coreData = await this.prisma.coreData.findUnique({
      where: { cartel: parseInt(data.numeroCartellino, 10) },
    });

    if (!coreData) {
      throw new NotFoundException(`Cartellino ${data.numeroCartellino} non trovato in CoreData`);
    }

    // Create record with exceptions in a transaction
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.qualityRecord.create({
        data: {
          numeroCartellino: data.numeroCartellino,
          reparto: data.reparto,
          operatore: data.operatore,
          tipoCq: data.tipoCq || 'INTERNO',
          paiaTotali: data.paiaTotali,
          codArticolo: data.codArticolo,
          articolo: data.articolo,
          linea: data.linea,
          note: data.note,
          haEccezioni: data.haEccezioni ?? false,
        },
      });

      // Create exceptions if provided
      if (data.exceptions && data.exceptions.length > 0) {
        await tx.qualityException.createMany({
          data: data.exceptions.map((exc) => ({
            cartellinoId: record.id,
            taglia: exc.taglia,
            tipoDifetto: exc.tipoDifetto,
            noteOperatore: exc.noteOperatore,
            fotoPath: exc.fotoPath,
          })),
        });

        // Update haEccezioni flag
        await tx.qualityRecord.update({
          where: { id: record.id },
          data: { haEccezioni: true },
        });
      }

      // Return record with exceptions
      return tx.qualityRecord.findUnique({
        where: { id: record.id },
        include: {
          exceptions: true,
        },
      });
    });
  }

  async checkCartellino(numeroCartellino: string) {
    const cartel = parseInt(numeroCartellino, 10);
    const coreData = await this.prisma.coreData.findUnique({
      where: { cartel },
      select: {
        cartel: true,
        articolo: true,
        descrizioneArticolo: true,
        commessaCli: true,
        ragioneSociale: true,
        ln: true,
        tot: true,
      },
    });

    if (!coreData) {
      throw new NotFoundException(`Cartellino ${numeroCartellino} non trovato`);
    }

    return {
      ...coreData,
      numeroPaia: coreData.tot,
    };
  }

  async checkCommessa(commessa: string) {
    const coreData = await this.prisma.coreData.findFirst({
      where: { commessaCli: commessa },
      select: {
        cartel: true,
        articolo: true,
        descrizioneArticolo: true,
        commessaCli: true,
        ragioneSociale: true,
        ln: true,
        tot: true,
      },
    });

    if (!coreData) {
      throw new NotFoundException(`Commessa ${commessa} non trovata`);
    }

    return {
      ...coreData,
      numeroPaia: coreData.tot,
    };
  }

  // ==================== DASHBOARD STATISTICS ====================

  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [recordsToday, exceptionsThisMonth, recordsThisWeek, activeDepartments] =
      await Promise.all([
        this.prisma.qualityRecord.count({
          where: {
            dataControllo: {
              gte: today,
              lt: tomorrow,
            },
          },
        }),
        this.prisma.qualityException.count({
          where: {
            dataCreazione: {
              gte: monthStart,
            },
          },
        }),
        this.prisma.qualityRecord.count({
          where: {
            dataControllo: {
              gte: weekAgo,
            },
          },
        }),
        this.prisma.qualityDepartment.count({
          where: { attivo: true },
        }),
      ]);

    return {
      recordsToday,
      exceptionsThisMonth,
      recordsThisWeek,
      activeDepartments,
    };
  }

  async getWeeklyRecords() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);

    const records = await this.prisma.qualityRecord.findMany({
      where: {
        dataControllo: {
          gte: weekAgo,
        },
      },
      select: {
        dataControllo: true,
      },
    });

    // Group by date
    const recordsByDate: Record<string, number> = {};
    records.forEach((record) => {
      const dateKey = record.dataControllo.toISOString().split('T')[0];
      recordsByDate[dateKey] = (recordsByDate[dateKey] || 0) + 1;
    });

    return recordsByDate;
  }

  async getExceptionsByDepartment() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const records = await this.prisma.qualityRecord.findMany({
      where: {
        dataControllo: {
          gte: thirtyDaysAgo,
        },
        haEccezioni: true,
      },
      select: {
        reparto: true,
        exceptions: true,
      },
    });

    // Count exceptions by department
    const exceptionsByDept: Record<string, number> = {};
    records.forEach((record) => {
      if (record.reparto) {
        exceptionsByDept[record.reparto] =
          (exceptionsByDept[record.reparto] || 0) + record.exceptions.length;
      }
    });

    return exceptionsByDept;
  }

  async getDefectRateByDepartment() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const records = await this.prisma.qualityRecord.findMany({
      where: {
        dataControllo: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        reparto: true,
        haEccezioni: true,
      },
    });

    // Calculate defect rate by department
    const statsByDept: Record<string, { total: number; withDefects: number }> = {};
    records.forEach((record) => {
      if (record.reparto) {
        if (!statsByDept[record.reparto]) {
          statsByDept[record.reparto] = { total: 0, withDefects: 0 };
        }
        statsByDept[record.reparto].total++;
        if (record.haEccezioni) {
          statsByDept[record.reparto].withDefects++;
        }
      }
    });

    // Calculate percentage
    const defectRates: Record<string, number> = {};
    Object.entries(statsByDept).forEach(([dept, stats]) => {
      defectRates[dept] = stats.total > 0 ? (stats.withDefects / stats.total) * 100 : 0;
    });

    return defectRates;
  }

  async getOperatorDailySummary(operatore: string, date: string) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const records = await this.prisma.qualityRecord.findMany({
      where: {
        operatore,
        dataControllo: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        exceptions: true,
      },
      orderBy: { dataControllo: 'desc' },
    });

    const totalRecords = records.length;
    const totalExceptions = records.reduce((sum, r) => sum + r.exceptions.length, 0);

    // Top defect types
    const defectCounts: Record<string, number> = {};
    records.forEach((record) => {
      record.exceptions.forEach((exc) => {
        defectCounts[exc.tipoDifetto] = (defectCounts[exc.tipoDifetto] || 0) + 1;
      });
    });

    // Top departments
    const deptCounts: Record<string, number> = {};
    records.forEach((record) => {
      if (record.reparto) {
        deptCounts[record.reparto] = (deptCounts[record.reparto] || 0) + 1;
      }
    });

    return {
      totalRecords,
      totalExceptions,
      records,
      topDefects: Object.entries(defectCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5),
      topDepartments: Object.entries(deptCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5),
    };
  }

  // ==================== UTILITIES ====================

  async getUniqueOperators() {
    const records = await this.prisma.qualityRecord.findMany({
      select: { operatore: true },
      distinct: ['operatore'],
      orderBy: { operatore: 'asc' },
    });
    return records.map((r) => r.operatore);
  }

  async getDefectCategories() {
    const categories = await this.prisma.qualityDefectType.findMany({
      where: { attivo: true },
      select: { categoria: true },
      distinct: ['categoria'],
    });
    return categories
      .filter((c) => c.categoria)
      .map((c) => c.categoria)
      .sort();
  }

  // ==================== REPORTISTICA ====================

  async getReportStatistics(filters?: FilterRecordsDto) {
    const where: any = {};

    if (filters?.dataInizio || filters?.dataFine) {
      where.dataControllo = {};
      if (filters.dataInizio) {
        where.dataControllo.gte = new Date(filters.dataInizio);
      }
      if (filters.dataFine) {
        const endDate = new Date(filters.dataFine);
        endDate.setHours(23, 59, 59, 999);
        where.dataControllo.lte = endDate;
      }
    }

    if (filters?.reparto) where.reparto = filters.reparto;
    if (filters?.operatore) where.operatore = filters.operatore;
    if (filters?.tipoCq) where.tipoCq = filters.tipoCq;

    // Get all records with exceptions
    const records = await this.prisma.qualityRecord.findMany({
      where,
      include: {
        exceptions: true,
      },
    });

    // Get all operators to map matricola -> nome completo
    const operators = await this.prisma.inworkOperator.findMany({
      select: {
        matricola: true,
        nome: true,
        cognome: true,
      },
    });

    // Get all departments to map id -> nome_reparto
    const departments = await this.prisma.qualityDepartment.findMany({
      select: {
        id: true,
        nomeReparto: true,
      },
    });

    // Get all defect types to map id -> descrizione
    const defectTypes = await this.prisma.qualityDefectType.findMany({
      select: {
        id: true,
        descrizione: true,
      },
    });

    // Create operator map: matricola -> nome completo
    const operatorMap = new Map<string, string>();
    operators.forEach((op) => {
      operatorMap.set(op.matricola, `${op.nome} ${op.cognome}`);
    });

    // Create department map: id -> nome_reparto
    const departmentMap = new Map<string, string>();
    departments.forEach((dept) => {
      departmentMap.set(String(dept.id), dept.nomeReparto);
    });

    // Create defect type map: id -> descrizione
    const defectTypeMap = new Map<string, string>();
    defectTypes.forEach((defect) => {
      defectTypeMap.set(String(defect.id), defect.descrizione);
    });

    // Calculate statistics
    const totalRecords = records.length;
    const recordsWithExceptions = records.filter((r) => r.haEccezioni).length;
    const recordsOk = totalRecords - recordsWithExceptions;
    const totalExceptions = records.reduce((sum, r) => sum + r.exceptions.length, 0);

    // Group by department
    const byDepartment: Record<string, any> = {};
    records.forEach((r) => {
      // Map department ID to name
      const deptName = r.reparto ? (departmentMap.get(r.reparto) || r.reparto) : 'NON SPECIFICATO';
      if (!byDepartment[deptName]) {
        byDepartment[deptName] = { total: 0, exceptions: 0, ok: 0, exceptionCount: 0 };
      }
      byDepartment[deptName].total++;
      if (r.haEccezioni) {
        byDepartment[deptName].exceptions++;
        byDepartment[deptName].exceptionCount += r.exceptions.length;
      } else {
        byDepartment[deptName].ok++;
      }
    });

    // Group by operator (with full name)
    const byOperator: Record<string, any> = {};
    records.forEach((r) => {
      // Get operator full name from map, fallback to matricola if not found
      const operatorName = operatorMap.get(r.operatore) || r.operatore;
      if (!byOperator[operatorName]) {
        byOperator[operatorName] = { total: 0, exceptions: 0, ok: 0, exceptionCount: 0 };
      }
      byOperator[operatorName].total++;
      if (r.haEccezioni) {
        byOperator[operatorName].exceptions++;
        byOperator[operatorName].exceptionCount += r.exceptions.length;
      } else {
        byOperator[operatorName].ok++;
      }
    });

    // Group by type
    const byType: Record<string, any> = {};
    records.forEach((r) => {
      const type = r.tipoCq;
      if (!byType[type]) {
        byType[type] = { total: 0, exceptions: 0, ok: 0 };
      }
      byType[type].total++;
      if (r.haEccezioni) {
        byType[type].exceptions++;
      } else {
        byType[type].ok++;
      }
    });

    // Count exception types
    const exceptionTypes: Record<string, number> = {};
    records.forEach((r) => {
      r.exceptions.forEach((exc) => {
        // Map defect type ID to description
        const defectName = defectTypeMap.get(exc.tipoDifetto) || exc.tipoDifetto;
        exceptionTypes[defectName] = (exceptionTypes[defectName] || 0) + 1;
      });
    });

    // Count by date
    const byDate: Record<string, any> = {};
    records.forEach((r) => {
      const date = r.dataControllo.toISOString().split('T')[0];
      if (!byDate[date]) {
        byDate[date] = { total: 0, exceptions: 0, ok: 0 };
      }
      byDate[date].total++;
      if (r.haEccezioni) {
        byDate[date].exceptions++;
      } else {
        byDate[date].ok++;
      }
    });

    return {
      summary: {
        totalRecords,
        recordsWithExceptions,
        recordsOk,
        totalExceptions,
        successRate: totalRecords > 0 ? ((recordsOk / totalRecords) * 100).toFixed(2) : '0',
      },
      byDepartment,
      byOperator,
      byType,
      exceptionTypes,
      byDate,
    };
  }
}
