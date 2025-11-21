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

    // Create PDF - A4 = 595x842 punti
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 20, bottom: 20, left: 20, right: 20 },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    // Dimensioni pagina utilizzabili
    const pageWidth = 595 - 40; // 555 punti
    const pageHeight = 842 - 40; // 802 punti

    // Format date info
    const dayName = this.DAY_NAMES[productionDate.getUTCDay()];
    const monthName = this.MONTH_NAMES[month - 1];
    const weekNumber = this.getWeekNumber(productionDate);

    // Header principale
    doc.fontSize(24).font('Helvetica-Bold')
      .text(`PRODUZIONE ${dayName} ${day} ${monthName} ${year}`, { align: 'center' });

    doc.moveDown(0.3);

    // ============ SEZIONE DATI GIORNALIERI ============
    const dailyBoxY = doc.y;
    const dailyBoxHeight = 200;
    doc.lineWidth(1);
    doc.rect(20, dailyBoxY, pageWidth, dailyBoxHeight).stroke();

    // Intestazione nera
    const headerHeight = 25;
    doc.rect(20, dailyBoxY, 180, headerHeight).fill('black');
    doc.fillColor('white').fontSize(14).font('Helvetica-Bold')
      .text('DATI GIORNALIERI', 30, dailyBoxY + 6);

    doc.fillColor('black');
    doc.lineWidth(0.5);

    // Organize values by department
    const valuesByDept = new Map<number, { valore: number; note: string }>();
    if (record) {
      record.valori.forEach(v => {
        valuesByDept.set(v.departmentId, { valore: v.valore, note: v.note || '' });
      });
    }

    // Strisce alternate grigio/bianco
    const numRows = phases.reduce((sum, p) => sum + p.reparti.length, 0);
    const rowHeight = 18;
    for (let i = 0; i < numRows; i++) {
      const isGray = i % 2 === 0;
      if (isGray) {
        doc.rect(25, dailyBoxY + headerHeight + 5 + (i * rowHeight), pageWidth - 10, rowHeight).fill('#f0f0f0');
      }
    }

    doc.fillColor('black');

    // Dati giornalieri - layout a 4 colonne
    let rowY = dailyBoxY + headerHeight + 8;
    const leftMargin = 30;
    const col1Width = 100;  // Nome reparto
    const col2Width = 60;   // Valore
    const col3Width = 50;   // "NOTE:"
    const col4Width = pageWidth - col1Width - col2Width - col3Width - 30; // Note text

    phases.forEach(phase => {
      phase.reparti.forEach(dept => {
        const value = valuesByDept.get(dept.id);

        doc.fontSize(11).font('Helvetica-Bold')
          .text(`${dept.nome}:`, leftMargin, rowY, { width: col1Width, continued: false });

        doc.fontSize(12).font('Helvetica')
          .text(value?.valore?.toString() || '0', leftMargin + col1Width, rowY, { width: col2Width });

        doc.fontSize(11).font('Helvetica-Bold')
          .text('NOTE:', leftMargin + col1Width + col2Width, rowY, { width: col3Width });

        doc.fontSize(10).font('Helvetica')
          .text(value?.note || '', leftMargin + col1Width + col2Width + col3Width, rowY, { width: col4Width });

        rowY += rowHeight;
      });
    });

    // ============ TOTALI GIORNALIERI (SUBITO DOPO DATI) ============
    doc.y = dailyBoxY + dailyBoxHeight + 10;
    await this.generateFinalTotals(doc, record, phases);

    doc.y += 20;

    // ============ SEZIONE RIEPILOGO SETTIMANA (STESSA PAGINA) ============
    await this.generateWeeklySummary(doc, productionDate, weekNumber, phases, false);

    // ============ SEZIONE RIEPILOGO MESE (STESSA PAGINA) ============
    await this.generateMonthlySummary(doc, productionDate, monthName, phases, false);

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

  private async generateWeeklySummary(doc: any, productionDate: Date, weekNumber: number, phases: any[], addPage: boolean) {
    // Calculate week range (Monday to Saturday)
    const dayOfWeek = productionDate.getUTCDay() || 7;
    const monday = new Date(productionDate);
    monday.setUTCDate(productionDate.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const saturday = new Date(monday);
    saturday.setUTCDate(monday.getUTCDate() + 5);

    // SEMPRE mostra tutti i giorni Lun-Sab, anche senza dati
    const allDaysOfWeek: Date[] = [];
    for (let i = 0; i < 6; i++) {
      const day = new Date(monday);
      day.setUTCDate(monday.getUTCDate() + i);
      allDaysOfWeek.push(day);
    }

    // Get weekly records (se esistono)
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

    // Map records by date
    const recordsByDate = new Map();
    weeklyRecords.forEach(rec => {
      const dateKey = rec.productionDate.toISOString().split('T')[0];
      recordsByDate.set(dateKey, rec);
    });

    const pageWidth = 595 - 40; // 555 punti

    // Section header - STESSA PAGINA se addPage = false
    const weekBoxY = doc.y;
    const weekBoxHeight = 240;
    doc.lineWidth(1);
    doc.rect(20, weekBoxY, pageWidth, weekBoxHeight).stroke();

    // Intestazione nera
    const headerHeight = 25;
    doc.rect(20, weekBoxY, 220, headerHeight).fill('black');
    doc.fillColor('white').fontSize(14).font('Helvetica-Bold')
      .text('RIEPILOGO SETTIMANA', 30, weekBoxY + 6, { width: 200 });

    doc.fillColor('black').fontSize(12).font('Helvetica-Bold')
      .text(`SETTIMANA ${weekNumber}`, 470, weekBoxY + 8, { align: 'left', width: 100 });

    // Build table header con CODICI
    const deptColumns: { deptId: number; code: string }[] = [];
    phases.forEach(phase => {
      phase.reparti.forEach(dept => {
        deptColumns.push({ deptId: dept.id, code: dept.codice || dept.nome.substring(0, 6).toUpperCase() });
      });
    });

    // Draw header
    const leftMargin = 25;
    const tableY = weekBoxY + headerHeight + 5;
    const dateColWidth = 40;
    const dayColWidth = 80;
    const dataColsWidth = pageWidth - dateColWidth - dayColWidth - 10;
    const colWidth = dataColsWidth / deptColumns.length;

    // Draw header con codici reparti
    const headerRowHeight = 20;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.rect(leftMargin, tableY, pageWidth - 10, headerRowHeight).fill('#c0c0c0');
    doc.fillColor('black');

    doc.text('DATA', leftMargin + 5, tableY + 5, { width: dateColWidth - 5 });
    doc.text('GIORNO', leftMargin + dateColWidth + 5, tableY + 5, { width: dayColWidth - 5 });

    deptColumns.forEach((col, i) => {
      const x = leftMargin + dateColWidth + dayColWidth + (i * colWidth);
      doc.text(col.code, x, tableY + 5, { width: colWidth - 2, align: 'center' });
    });

    // Draw data rows - SEMPRE 6 giorni (Lun-Sab)
    let rowY = tableY + headerRowHeight;
    const dataRowHeight = 25;
    const weeklyTotals: Record<number, number> = {};
    deptColumns.forEach(col => weeklyTotals[col.deptId] = 0);

    allDaysOfWeek.forEach((dayDate, idx) => {
      const dateKey = dayDate.toISOString().split('T')[0];
      const record = recordsByDate.get(dateKey);

      const dayNum = dayDate.getUTCDate();
      const dayName = this.DAY_NAMES[dayDate.getUTCDay()];

      // Alternating row background
      if (idx % 2 === 0) {
        doc.rect(leftMargin, rowY, pageWidth - 10, dataRowHeight).fill('#f5f5f5');
      }
      doc.fillColor('black');

      doc.fontSize(11).font('Helvetica')
        .text(dayNum.toString(), leftMargin + 5, rowY + 7, { width: dateColWidth - 5, align: 'center' })
        .text(dayName.toUpperCase(), leftMargin + dateColWidth + 5, rowY + 7, { width: dayColWidth - 5, align: 'left' });

      // Get values from record if exists
      const valueMap = new Map<number, number>();
      if (record) {
        record.valori.forEach(v => {
          valueMap.set(v.departmentId, v.valore);
          weeklyTotals[v.departmentId] = (weeklyTotals[v.departmentId] || 0) + v.valore;
        });
      }

      deptColumns.forEach((col, i) => {
        const x = leftMargin + dateColWidth + dayColWidth + (i * colWidth);
        const val = valueMap.get(col.deptId) || 0;
        doc.text(val.toString(), x, rowY + 7, { width: colWidth - 2, align: 'center' });
      });

      rowY += dataRowHeight;
    });

    // Totals row
    const totalRowHeight = 20;
    doc.rect(leftMargin, rowY, pageWidth - 10, totalRowHeight).fill('#c0c0c0');
    doc.fillColor('black');
    doc.fontSize(11).font('Helvetica-Bold')
      .text('TOTALI SETTIMANA', leftMargin + 5, rowY + 5, { width: dateColWidth + dayColWidth - 5, align: 'center' });

    deptColumns.forEach((col, i) => {
      const x = leftMargin + dateColWidth + dayColWidth + (i * colWidth);
      doc.text(weeklyTotals[col.deptId].toString(), x, rowY + 5, { width: colWidth - 2, align: 'center' });
    });

    doc.y = weekBoxY + weekBoxHeight + 10;
  }

  private async generateMonthlySummary(doc: any, productionDate: Date, monthName: string, phases: any[], addPage: boolean) {
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

    // Calcola TUTTE le settimane del mese
    const allWeeksInMonth = new Set<number>();
    const currentDate = new Date(startOfMonth);
    while (currentDate <= endOfMonth) {
      allWeeksInMonth.add(this.getWeekNumber(currentDate));
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    // Group by week
    const weeklyData = new Map<number, Map<number, number>>();
    const deptColumns: { deptId: number; code: string }[] = [];

    phases.forEach(phase => {
      phase.reparti.forEach(dept => {
        deptColumns.push({ deptId: dept.id, code: dept.codice || dept.nome.substring(0, 6).toUpperCase() });
      });
    });

    // Inizializza TUTTE le settimane con 0
    allWeeksInMonth.forEach(weekNum => {
      weeklyData.set(weekNum, new Map());
      deptColumns.forEach(col => weeklyData.get(weekNum)!.set(col.deptId, 0));
    });

    // Aggiungi i dati effettivi
    monthlyRecords.forEach(record => {
      const weekNum = this.getWeekNumber(record.productionDate);

      record.valori.forEach(v => {
        const current = weeklyData.get(weekNum)!.get(v.departmentId) || 0;
        weeklyData.get(weekNum)!.set(v.departmentId, current + v.valore);
      });
    });

    const pageWidth = 595 - 40; // 555 punti

    // Section header - STESSA PAGINA
    const monthBoxY = doc.y;
    const numWeeks = allWeeksInMonth.size;
    const monthBoxHeight = 50 + (numWeeks * 25) + 25; // header + rows + totals

    doc.lineWidth(1);
    doc.rect(20, monthBoxY, pageWidth, monthBoxHeight).stroke();

    // Intestazione nera
    const headerHeight = 25;
    doc.rect(20, monthBoxY, 180, headerHeight).fill('black');
    doc.fillColor('white').fontSize(14).font('Helvetica-Bold')
      .text('RIEPILOGO MESE', 30, monthBoxY + 6, { width: 150 });

    doc.fillColor('black').fontSize(12).font('Helvetica-Bold')
      .text(monthName, 470, monthBoxY + 8, { align: 'left', width: 100 });

    // Table header con codici
    const leftMargin = 25;
    const tableY = monthBoxY + headerHeight + 5;
    const weekColWidth = 120;
    const dataColsWidth = pageWidth - weekColWidth - 10;
    const colWidth = dataColsWidth / deptColumns.length;

    const headerRowHeight = 20;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.rect(leftMargin, tableY, pageWidth - 10, headerRowHeight).fill('#c0c0c0');
    doc.fillColor('black');

    doc.text('SETTIMANA', leftMargin + 5, tableY + 5, { width: weekColWidth - 5, align: 'center' });

    deptColumns.forEach((col, i) => {
      const x = leftMargin + weekColWidth + (i * colWidth);
      doc.text(col.code, x, tableY + 5, { width: colWidth - 2, align: 'center' });
    });

    // Data rows
    let rowY = tableY + headerRowHeight;
    const dataRowHeight = 25;
    const monthlyTotals: Record<number, number> = {};
    deptColumns.forEach(col => monthlyTotals[col.deptId] = 0);

    const sortedWeeks = Array.from(weeklyData.keys()).sort((a, b) => a - b);

    sortedWeeks.forEach((weekNum, idx) => {
      const weekTotals = weeklyData.get(weekNum)!;

      if (idx % 2 === 0) {
        doc.rect(leftMargin, rowY, pageWidth - 10, dataRowHeight).fill('#f5f5f5');
      }
      doc.fillColor('black');

      doc.fontSize(11).font('Helvetica')
        .text(`Settimana ${weekNum}`, leftMargin + 5, rowY + 7, { width: weekColWidth - 5, align: 'center' });

      deptColumns.forEach((col, i) => {
        const x = leftMargin + weekColWidth + (i * colWidth);
        const val = weekTotals.get(col.deptId) || 0;
        monthlyTotals[col.deptId] += val;
        doc.text(val.toString(), x, rowY + 7, { width: colWidth - 2, align: 'center' });
      });

      rowY += dataRowHeight;
    });

    // Totals row
    const totalRowHeight = 20;
    doc.rect(leftMargin, rowY, pageWidth - 10, totalRowHeight).fill('#c0c0c0');
    doc.fillColor('black');
    doc.fontSize(11).font('Helvetica-Bold')
      .text('TOTALI', leftMargin + 5, rowY + 5, { width: weekColWidth - 5, align: 'center' });

    deptColumns.forEach((col, i) => {
      const x = leftMargin + weekColWidth + (i * colWidth);
      doc.text(monthlyTotals[col.deptId].toString(), x, rowY + 5, { width: colWidth - 2, align: 'center' });
    });

    doc.y = monthBoxY + monthBoxHeight + 10;
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

    const pageWidth = 595 - 40; // 555 punti

    // Draw totals boxes - horizontal layout con stile moderno
    const numPhases = phases.length;
    const spacing = 20;
    const totalBoxesWidth = pageWidth - 20;
    const boxWidth = (totalBoxesWidth - (spacing * (numPhases - 1))) / numPhases;
    const boxHeight = 50;

    let boxX = 30;
    const startY = doc.y;

    phases.forEach(phase => {
      const total = phaseTotals[phase.nome] || 0;

      // Box principale con sfondo grigio chiaro e bordo
      doc.save();
      doc.roundedRect(boxX, startY, boxWidth, boxHeight, 4);
      doc.lineWidth(1.5);
      doc.fillAndStroke('#f8f8f8', '#cccccc');
      doc.restore();

      // Label sopra
      doc.fillColor('#666666')
        .fontSize(9).font('Helvetica-Bold');
      doc.text(`TOTALE ${phase.nome.toUpperCase()}`, boxX, startY + 10, {
        width: boxWidth,
        align: 'center',
        lineBreak: false
      });

      // Valore grande sotto
      doc.fillColor('#000000')
        .fontSize(22).font('Helvetica-Bold');
      doc.text(total.toString(), boxX, startY + 26, {
        width: boxWidth,
        align: 'center',
        lineBreak: false
      });

      boxX += boxWidth + spacing;
    });

    doc.y = startY + boxHeight;
  }
}
