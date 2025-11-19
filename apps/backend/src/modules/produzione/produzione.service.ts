import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import * as PDFDocument from 'pdfkit';

@Injectable()
export class ProduzioneService {
  constructor(private prisma: PrismaService) {}

  // ==================== PHASES ====================

  async getAllPhases() {
    return this.prisma.productionPhase.findMany({
      where: { attivo: true },
      include: {
        reparti: {
          where: { attivo: true },
          orderBy: { ordine: 'asc' },
        },
      },
      orderBy: { ordine: 'asc' },
    });
  }

  async getPhaseById(id: number) {
    return this.prisma.productionPhase.findUnique({
      where: { id },
      include: {
        reparti: {
          orderBy: { ordine: 'asc' },
        },
      },
    });
  }

  async createPhase(data: any) {
    return this.prisma.productionPhase.create({
      data: {
        nome: data.nome,
        codice: data.codice,
        colore: data.colore,
        icona: data.icona,
        descrizione: data.descrizione,
        ordine: data.ordine || 0,
      },
    });
  }

  async updatePhase(id: number, data: any) {
    return this.prisma.productionPhase.update({
      where: { id },
      data: {
        nome: data.nome,
        codice: data.codice,
        colore: data.colore,
        icona: data.icona,
        descrizione: data.descrizione,
        attivo: data.attivo,
        ordine: data.ordine,
      },
    });
  }

  async deletePhase(id: number) {
    return this.prisma.productionPhase.delete({
      where: { id },
    });
  }

  // ==================== DEPARTMENTS ====================

  async getAllDepartments() {
    return this.prisma.productionDepartment.findMany({
      where: { attivo: true },
      include: {
        phase: true,
      },
      orderBy: [{ phase: { ordine: 'asc' } }, { ordine: 'asc' }],
    });
  }

  async getDepartmentById(id: number) {
    return this.prisma.productionDepartment.findUnique({
      where: { id },
      include: { phase: true },
    });
  }

  async createDepartment(data: any) {
    return this.prisma.productionDepartment.create({
      data: {
        phaseId: data.phaseId,
        nome: data.nome,
        codice: data.codice,
        descrizione: data.descrizione,
        ordine: data.ordine || 0,
      },
    });
  }

  async updateDepartment(id: number, data: any) {
    return this.prisma.productionDepartment.update({
      where: { id },
      data: {
        phaseId: data.phaseId,
        nome: data.nome,
        codice: data.codice,
        descrizione: data.descrizione,
        attivo: data.attivo,
        ordine: data.ordine,
      },
    });
  }

  async deleteDepartment(id: number) {
    return this.prisma.productionDepartment.delete({
      where: { id },
    });
  }

  // ==================== PRODUCTION DATA ====================

  // Get calendar data for a month
  async getCalendarData(month: number, year: number) {
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0));

    const records = await this.prisma.productionRecord.findMany({
      where: {
        productionDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        valori: {
          include: {
            department: {
              include: { phase: true },
            },
          },
        },
      },
      orderBy: { productionDate: "asc" },
    });

    // Create a map of days with data
    const daysWithData = new Map();
    records.forEach((record) => {
      const day = record.productionDate.getUTCDate();
      const total = record.valori.reduce((sum, v) => sum + v.valore, 0);

      if (total > 0) {
        daysWithData.set(day, {
          id: record.id,
          total,
          hasData: true,
        });
      }
    });

    return {
      month,
      year,
      daysInMonth: endDate.getUTCDate(),
      firstDayOfWeek: startDate.getUTCDay(),
      daysWithData: Object.fromEntries(daysWithData),
    };
  }

  // Get or create record by date
  async getByDate(date: string) {
    const [year, month, day] = date.split('-').map(Number);

    if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) {
      throw new BadRequestException("Invalid date format. Expected YYYY-MM-DD");
    }

    const productionDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

    let record = await this.prisma.productionRecord.findUnique({
      where: { productionDate },
      include: {
        valori: {
          include: {
            department: {
              include: { phase: true },
            },
          },
        },
        creator: { select: { id: true, nome: true, userName: true } },
        updater: { select: { id: true, nome: true, userName: true } },
      },
    });

    // Get all active departments for the form
    const departments = await this.prisma.productionDepartment.findMany({
      where: { attivo: true },
      include: { phase: true },
      orderBy: [{ phase: { ordine: 'asc' } }, { ordine: 'asc' }],
    });

    if (!record) {
      // Return empty template
      return {
        id: null,
        productionDate,
        valori: departments.map(dept => ({
          departmentId: dept.id,
          department: dept,
          valore: 0,
          note: null,
        })),
        creator: null,
        updater: null,
        isNew: true,
      };
    }

    // Ensure all departments are represented
    const existingDeptIds = record.valori.map(v => v.departmentId);
    const missingDepts = departments.filter(d => !existingDeptIds.includes(d.id));

    const allValori = [
      ...record.valori,
      ...missingDepts.map(dept => ({
        id: null,
        departmentId: dept.id,
        department: dept,
        valore: 0,
        note: null,
      })),
    ].sort((a, b) => {
      const phaseOrder = (a.department.phase?.ordine || 0) - (b.department.phase?.ordine || 0);
      if (phaseOrder !== 0) return phaseOrder;
      return (a.department.ordine || 0) - (b.department.ordine || 0);
    });

    return { ...record, valori: allValori, isNew: false };
  }

  // Create or update record
  async upsert(date: string, data: any, userId: number) {
    const [year, month, day] = date.split('-').map(Number);
    const productionDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

    // Upsert the record
    const record = await this.prisma.productionRecord.upsert({
      where: { productionDate },
      create: {
        productionDate,
        createdBy: userId,
        updatedBy: userId,
      },
      update: {
        updatedBy: userId,
      },
    });

    // Upsert values for each department
    if (data.valori && Array.isArray(data.valori)) {
      for (const valore of data.valori) {
        if (valore.departmentId) {
          await this.prisma.productionValue.upsert({
            where: {
              recordId_departmentId: {
                recordId: record.id,
                departmentId: valore.departmentId,
              },
            },
            create: {
              recordId: record.id,
              departmentId: valore.departmentId,
              valore: valore.valore || 0,
              note: valore.note || null,
            },
            update: {
              valore: valore.valore || 0,
              note: valore.note || null,
            },
          });
        }
      }
    }

    return this.getByDate(date);
  }

  // ==================== STATISTICS ====================

  // Helper to calculate totals from values
  private calculateTotalsFromValues(valori: any[]) {
    const byPhase: Record<string, number> = {};
    let total = 0;

    valori.forEach(v => {
      const phaseName = v.department?.phase?.nome || 'Altro';
      byPhase[phaseName] = (byPhase[phaseName] || 0) + v.valore;
      total += v.valore;
    });

    return { byPhase, total };
  }

  async getTodayStats() {
    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

    const record = await this.prisma.productionRecord.findUnique({
      where: { productionDate: todayUTC },
      include: {
        valori: {
          include: {
            department: { include: { phase: true } },
          },
        },
      },
    });

    if (!record) {
      return { total: 0, byPhase: {} };
    }

    return this.calculateTotalsFromValues(record.valori);
  }

  async getWeekStats() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayLocal = new Date(today);
    mondayLocal.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const monday = new Date(Date.UTC(mondayLocal.getFullYear(), mondayLocal.getMonth(), mondayLocal.getDate()));
    const saturday = new Date(Date.UTC(mondayLocal.getFullYear(), mondayLocal.getMonth(), mondayLocal.getDate() + 5, 23, 59, 59, 999));

    const records = await this.prisma.productionRecord.findMany({
      where: {
        productionDate: { gte: monday, lte: saturday },
      },
      include: {
        valori: {
          include: {
            department: { include: { phase: true } },
          },
        },
      },
    });

    const byPhase: Record<string, number> = {};
    let total = 0;

    records.forEach(record => {
      record.valori.forEach(v => {
        const phaseName = v.department?.phase?.nome || 'Altro';
        byPhase[phaseName] = (byPhase[phaseName] || 0) + v.valore;
        total += v.valore;
      });
    });

    return {
      total,
      byPhase,
      weekStart: monday.toISOString().split("T")[0],
      weekEnd: saturday.toISOString().split("T")[0],
    };
  }

  async getMonthStats(month?: number, year?: number) {
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    const startDate = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
    const endDate = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999));

    const records = await this.prisma.productionRecord.findMany({
      where: {
        productionDate: { gte: startDate, lte: endDate },
      },
      include: {
        valori: {
          include: {
            department: { include: { phase: true } },
          },
        },
      },
    });

    const byPhase: Record<string, number> = {};
    let total = 0;
    let daysWithData = 0;

    records.forEach(record => {
      let dayTotal = 0;
      record.valori.forEach(v => {
        const phaseName = v.department?.phase?.nome || 'Altro';
        byPhase[phaseName] = (byPhase[phaseName] || 0) + v.valore;
        total += v.valore;
        dayTotal += v.valore;
      });
      if (dayTotal > 0) daysWithData++;
    });

    return {
      total,
      byPhase,
      daysWithData,
      average: daysWithData > 0 ? Math.round(total / daysWithData) : 0,
      month: targetMonth,
      year: targetYear,
    };
  }

  async getTrendData(days: number = 30) {
    const now = new Date();
    const endDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
    const startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - days + 1));

    const records = await this.prisma.productionRecord.findMany({
      where: {
        productionDate: { gte: startDate, lte: endDate },
      },
      include: {
        valori: {
          include: {
            department: { include: { phase: true } },
          },
        },
      },
      orderBy: { productionDate: "asc" },
    });

    const data = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const record = records.find(
        (r) => r.productionDate.toISOString().split("T")[0] === dateStr
      );

      if (record) {
        const totals = this.calculateTotalsFromValues(record.valori);
        data.push({
          date: dateStr,
          totale: totals.total,
          ...totals.byPhase,
        });
      } else {
        data.push({
          date: dateStr,
          totale: 0,
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return data;
  }

  async getComparison(month1: number, year1: number, month2: number, year2: number) {
    const getMonthStats = async (month: number, year: number) => {
      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

      const records = await this.prisma.productionRecord.findMany({
        where: {
          productionDate: { gte: startDate, lte: endDate },
        },
        include: {
          valori: true,
        },
      });

      const total = records.reduce((sum, r) =>
        sum + r.valori.reduce((s, v) => s + v.valore, 0), 0
      );

      return { month, year, total };
    };

    const [stats1, stats2] = await Promise.all([
      getMonthStats(month1, year1),
      getMonthStats(month2, year2),
    ]);

    const percentChange = stats1.total > 0
      ? Math.round(((stats2.total - stats1.total) / stats1.total) * 100)
      : 0;

    return {
      current: stats2,
      previous: stats1,
      percentChange,
    };
  }

  async getMachinePerformance(startDate?: string, endDate?: string) {
    const now = new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    const end = endDate
      ? new Date(endDate)
      : new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0));

    const values = await this.prisma.productionValue.findMany({
      where: {
        record: {
          productionDate: { gte: start, lte: end },
        },
      },
      include: {
        department: {
          include: { phase: true },
        },
      },
    });

    // Group by phase
    const byPhase: Record<string, Record<string, number>> = {};

    values.forEach(v => {
      const phaseName = v.department.phase?.nome || 'Altro';
      const deptName = v.department.nome;

      if (!byPhase[phaseName]) {
        byPhase[phaseName] = {};
      }
      byPhase[phaseName][deptName] = (byPhase[phaseName][deptName] || 0) + v.valore;
    });

    return byPhase;
  }

  // ==================== PDF GENERATION ====================

  private readonly MONTH_NAMES = [
    'GENNAIO', 'FEBBRAIO', 'MARZO', 'APRILE', 'MAGGIO', 'GIUGNO',
    'LUGLIO', 'AGOSTO', 'SETTEMBRE', 'OTTOBRE', 'NOVEMBRE', 'DICEMBRE'
  ];

  private readonly DAY_NAMES = [
    'DOMENICA', 'LUNEDÌ', 'MARTEDÌ', 'MERCOLEDÌ', 'GIOVEDÌ', 'VENERDÌ', 'SABATO'
  ];

  async generatePdf(date: string): Promise<Buffer> {
    const [year, month, day] = date.split('-').map(Number);
    const productionDate = new Date(Date.UTC(year, month - 1, day));

    // Get record with all values
    const record = await this.prisma.productionRecord.findUnique({
      where: { productionDate },
      include: {
        valori: {
          include: {
            department: {
              include: { phase: true },
            },
          },
        },
      },
    });

    // Get all phases and departments for structure
    const phases = await this.getAllPhases();

    // Create PDF
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 20, bottom: 20, left: 20, right: 20 },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    // Format date info
    const dayName = this.DAY_NAMES[productionDate.getUTCDay()];
    const monthName = this.MONTH_NAMES[month - 1];
    const weekNumber = this.getWeekNumber(productionDate);

    // Header
    doc.fontSize(20).font('Helvetica-Bold')
      .text(`PRODUZIONE ${dayName} ${day} ${monthName} ${year}`, { align: 'center' });
    doc.moveDown();

    // Daily Data Section
    doc.fontSize(14).font('Helvetica-Bold')
      .fillColor('white')
      .rect(20, doc.y, 150, 20).fill('black')
      .fillColor('white')
      .text('DATI GIORNALIERI', 25, doc.y - 15);

    doc.fillColor('black');
    doc.moveDown(1.5);

    // Organize values by phase and department
    const valuesByDept = new Map<number, { valore: number; note: string }>();
    if (record) {
      record.valori.forEach(v => {
        valuesByDept.set(v.departmentId, { valore: v.valore, note: v.note || '' });
      });
    }

    // Daily data table
    const startY = doc.y;
    let currentY = startY;
    const col1X = 30;
    const col2X = 130;
    const col3X = 200;
    const col4X = 280;
    const rowHeight = 18;

    // Draw alternating backgrounds
    let rowIndex = 0;
    phases.forEach(phase => {
      phase.reparti.forEach(() => {
        if (rowIndex % 2 === 0) {
          doc.rect(20, currentY - 2, 555, rowHeight).fill('#f0f0f0');
        }
        currentY += rowHeight;
        rowIndex++;
      });
    });

    // Reset position and draw data
    currentY = startY;
    doc.fillColor('black');

    phases.forEach(phase => {
      phase.reparti.forEach(dept => {
        const value = valuesByDept.get(dept.id);

        doc.fontSize(9).font('Helvetica-Bold')
          .text(`${dept.nome}:`, col1X, currentY, { continued: false });

        doc.fontSize(11).font('Helvetica')
          .text(value?.valore?.toString() || '0', col2X, currentY);

        doc.fontSize(9).font('Helvetica-Bold')
          .text('NOTE:', col3X, currentY);

        doc.fontSize(7).font('Helvetica')
          .text(value?.note || '', col4X, currentY + 2, { width: 250 });

        currentY += rowHeight;
      });
    });

    doc.y = currentY + 10;

    // Weekly Summary Section
    await this.generateWeeklySummary(doc, productionDate, weekNumber, phases);

    // Monthly Summary Section
    await this.generateMonthlySummary(doc, productionDate, monthName, phases);

    // Final Totals
    await this.generateFinalTotals(doc, record, phases);

    // Footer
    doc.fontSize(8).font('Helvetica-Bold')
      .text('CALZATURIFICIO EMMEGIEMME SHOES SRL', 20, doc.page.height - 40, { align: 'right' });

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  private async generateWeeklySummary(doc: any, productionDate: Date, weekNumber: number, phases: any[]) {
    // Calculate week range
    const dayOfWeek = productionDate.getUTCDay() || 7;
    const monday = new Date(productionDate);
    monday.setUTCDate(productionDate.getUTCDate() - dayOfWeek + 1);
    const saturday = new Date(monday);
    saturday.setUTCDate(monday.getUTCDate() + 5);

    // Get weekly records
    const weeklyRecords = await this.prisma.productionRecord.findMany({
      where: {
        productionDate: {
          gte: monday,
          lte: saturday,
        },
      },
      include: {
        valori: {
          include: {
            department: { include: { phase: true } },
          },
        },
      },
      orderBy: { productionDate: 'asc' },
    });

    // Section header
    doc.addPage();
    doc.fontSize(14).font('Helvetica-Bold')
      .rect(20, 20, 180, 20).fill('black')
      .fillColor('white')
      .text('RIEPILOGO SETTIMANA', 25, 25);

    doc.fillColor('black')
      .text(`SETTIMANA ${weekNumber}`, 450, 25);

    doc.moveDown(2);

    // Build table header
    const headers = ['DATA', 'GIORNO'];
    const deptColumns: { phaseId: number; deptId: number; name: string }[] = [];

    phases.forEach(phase => {
      phase.reparti.forEach(dept => {
        const shortName = dept.nome.length > 8 ? dept.nome.substring(0, 8) : dept.nome;
        headers.push(shortName);
        deptColumns.push({ phaseId: phase.id, deptId: dept.id, name: dept.nome });
      });
    });

    // Draw header
    const tableY = doc.y;
    const colWidth = (555 - 40 - 50) / deptColumns.length;

    doc.fontSize(7).font('Helvetica-Bold');
    doc.rect(20, tableY, 555, 15).fill('#c0c0c0');
    doc.fillColor('black');

    doc.text('DATA', 25, tableY + 4, { width: 35 });
    doc.text('GIORNO', 60, tableY + 4, { width: 45 });

    deptColumns.forEach((col, i) => {
      const x = 110 + (i * colWidth);
      doc.text(col.name.substring(0, 6), x, tableY + 4, { width: colWidth - 2, align: 'center' });
    });

    // Draw data rows
    let rowY = tableY + 15;
    const weeklyTotals: Record<number, number> = {};
    deptColumns.forEach(col => weeklyTotals[col.deptId] = 0);

    weeklyRecords.forEach((record, idx) => {
      const recDate = record.productionDate;
      const dayNum = recDate.getUTCDate();
      const dayName = this.DAY_NAMES[recDate.getUTCDay()];

      // Alternating row background
      if (idx % 2 === 0) {
        doc.rect(20, rowY, 555, 15).fill('#f5f5f5');
      }
      doc.fillColor('black');

      doc.fontSize(8).font('Helvetica')
        .text(dayNum.toString(), 25, rowY + 4, { width: 35 })
        .text(dayName, 60, rowY + 4, { width: 45 });

      const valueMap = new Map<number, number>();
      record.valori.forEach(v => {
        valueMap.set(v.departmentId, v.valore);
        weeklyTotals[v.departmentId] = (weeklyTotals[v.departmentId] || 0) + v.valore;
      });

      deptColumns.forEach((col, i) => {
        const x = 110 + (i * colWidth);
        const val = valueMap.get(col.deptId) || 0;
        doc.text(val.toString(), x, rowY + 4, { width: colWidth - 2, align: 'center' });
      });

      rowY += 15;
    });

    // Totals row
    doc.rect(20, rowY, 555, 15).fill('#c0c0c0');
    doc.fillColor('black');
    doc.fontSize(7).font('Helvetica-Bold')
      .text('TOTALI SETTIMANA', 25, rowY + 4, { width: 80 });

    deptColumns.forEach((col, i) => {
      const x = 110 + (i * colWidth);
      doc.text(weeklyTotals[col.deptId].toString(), x, rowY + 4, { width: colWidth - 2, align: 'center' });
    });

    doc.y = rowY + 25;
  }

  private async generateMonthlySummary(doc: any, productionDate: Date, monthName: string, phases: any[]) {
    const year = productionDate.getUTCFullYear();
    const month = productionDate.getUTCMonth();

    const startOfMonth = new Date(Date.UTC(year, month, 1));
    const endOfMonth = new Date(Date.UTC(year, month + 1, 0));

    // Get all records for the month
    const monthlyRecords = await this.prisma.productionRecord.findMany({
      where: {
        productionDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        valori: true,
      },
      orderBy: { productionDate: 'asc' },
    });

    // Group by week
    const weeklyData = new Map<number, Map<number, number>>();
    const deptColumns: { deptId: number; name: string }[] = [];

    phases.forEach(phase => {
      phase.reparti.forEach(dept => {
        deptColumns.push({ deptId: dept.id, name: dept.nome });
      });
    });

    monthlyRecords.forEach(record => {
      const weekNum = this.getWeekNumber(record.productionDate);
      if (!weeklyData.has(weekNum)) {
        weeklyData.set(weekNum, new Map());
        deptColumns.forEach(col => weeklyData.get(weekNum)!.set(col.deptId, 0));
      }

      record.valori.forEach(v => {
        const current = weeklyData.get(weekNum)!.get(v.departmentId) || 0;
        weeklyData.get(weekNum)!.set(v.departmentId, current + v.valore);
      });
    });

    // Section header
    doc.moveDown(1);
    doc.fontSize(14).font('Helvetica-Bold')
      .rect(20, doc.y, 150, 20).fill('black')
      .fillColor('white')
      .text('RIEPILOGO MESE', 25, doc.y + 5);

    doc.fillColor('black')
      .text(monthName, 450, doc.y - 15);

    doc.moveDown(2);

    // Table header
    const tableY = doc.y;
    const colWidth = (555 - 60) / deptColumns.length;

    doc.fontSize(7).font('Helvetica-Bold');
    doc.rect(20, tableY, 555, 15).fill('#c0c0c0');
    doc.fillColor('black');

    doc.text('SETTIMANA', 25, tableY + 4, { width: 55 });

    deptColumns.forEach((col, i) => {
      const x = 80 + (i * colWidth);
      doc.text(col.name.substring(0, 6), x, tableY + 4, { width: colWidth - 2, align: 'center' });
    });

    // Data rows
    let rowY = tableY + 15;
    const monthlyTotals: Record<number, number> = {};
    deptColumns.forEach(col => monthlyTotals[col.deptId] = 0);

    const sortedWeeks = Array.from(weeklyData.keys()).sort((a, b) => a - b);

    sortedWeeks.forEach((weekNum, idx) => {
      const weekTotals = weeklyData.get(weekNum)!;

      if (idx % 2 === 0) {
        doc.rect(20, rowY, 555, 15).fill('#f5f5f5');
      }
      doc.fillColor('black');

      doc.fontSize(8).font('Helvetica')
        .text(`Settimana ${weekNum}`, 25, rowY + 4, { width: 55 });

      deptColumns.forEach((col, i) => {
        const x = 80 + (i * colWidth);
        const val = weekTotals.get(col.deptId) || 0;
        monthlyTotals[col.deptId] += val;
        doc.text(val.toString(), x, rowY + 4, { width: colWidth - 2, align: 'center' });
      });

      rowY += 15;
    });

    // Totals row
    doc.rect(20, rowY, 555, 15).fill('#c0c0c0');
    doc.fillColor('black');
    doc.fontSize(7).font('Helvetica-Bold')
      .text('TOTALI', 25, rowY + 4, { width: 55 });

    deptColumns.forEach((col, i) => {
      const x = 80 + (i * colWidth);
      doc.text(monthlyTotals[col.deptId].toString(), x, rowY + 4, { width: colWidth - 2, align: 'center' });
    });

    doc.y = rowY + 25;
  }

  private async generateFinalTotals(doc: any, record: any, phases: any[]) {
    // Calculate totals by phase
    const phaseTotals: Record<string, number> = {};

    if (record) {
      record.valori.forEach(v => {
        const phaseName = v.department.phase?.nome || 'Altro';
        phaseTotals[phaseName] = (phaseTotals[phaseName] || 0) + v.valore;
      });
    }

    doc.moveDown(2);

    // Draw totals boxes
    const boxWidth = 170;
    const boxHeight = 30;
    let boxX = (595 - (boxWidth * phases.length + 10 * (phases.length - 1))) / 2;

    phases.forEach(phase => {
      const total = phaseTotals[phase.nome] || 0;

      // Label box
      doc.rect(boxX, doc.y, boxWidth * 0.6, boxHeight).fill('black');
      doc.fillColor('white')
        .fontSize(10).font('Helvetica-Bold')
        .text(`TOT. ${phase.nome.toUpperCase()}:`, boxX + 5, doc.y + 10, { width: boxWidth * 0.6 - 10 });

      // Value box
      doc.rect(boxX + boxWidth * 0.6, doc.y - boxHeight, boxWidth * 0.4, boxHeight).stroke();
      doc.fillColor('black')
        .fontSize(14).font('Helvetica')
        .text(total.toString(), boxX + boxWidth * 0.6 + 5, doc.y - boxHeight + 8, {
          width: boxWidth * 0.4 - 10,
          align: 'center'
        });

      boxX += boxWidth + 10;
    });
  }
}
