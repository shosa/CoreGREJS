import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ProduzioneService } from './produzione.service';

@Controller('produzione')
@UseGuards(JwtAuthGuard)
export class ProduzioneController {
  constructor(private produzioneService: ProduzioneService) {}

  // ==================== PHASES ====================

  // GET /produzione/phases
  @Get('phases')
  async getAllPhases() {
    return this.produzioneService.getAllPhases();
  }

  // GET /produzione/phases/:id
  @Get('phases/:id')
  async getPhaseById(@Param('id') id: string) {
    return this.produzioneService.getPhaseById(parseInt(id));
  }

  // POST /produzione/phases
  @Post('phases')
  async createPhase(@Body() data: any) {
    return this.produzioneService.createPhase(data);
  }

  // PUT /produzione/phases/:id
  @Put('phases/:id')
  async updatePhase(@Param('id') id: string, @Body() data: any) {
    return this.produzioneService.updatePhase(parseInt(id), data);
  }

  // DELETE /produzione/phases/:id
  @Delete('phases/:id')
  async deletePhase(@Param('id') id: string) {
    return this.produzioneService.deletePhase(parseInt(id));
  }

  // ==================== DEPARTMENTS ====================

  // GET /produzione/departments
  @Get('departments')
  async getAllDepartments() {
    return this.produzioneService.getAllDepartments();
  }

  // GET /produzione/departments/:id
  @Get('departments/:id')
  async getDepartmentById(@Param('id') id: string) {
    return this.produzioneService.getDepartmentById(parseInt(id));
  }

  // POST /produzione/departments
  @Post('departments')
  async createDepartment(@Body() data: any) {
    return this.produzioneService.createDepartment(data);
  }

  // PUT /produzione/departments/:id
  @Put('departments/:id')
  async updateDepartment(@Param('id') id: string, @Body() data: any) {
    return this.produzioneService.updateDepartment(parseInt(id), data);
  }

  // DELETE /produzione/departments/:id
  @Delete('departments/:id')
  async deleteDepartment(@Param('id') id: string) {
    return this.produzioneService.deleteDepartment(parseInt(id));
  }

  // ==================== CALENDAR & DATA ====================

  // GET /produzione/calendar?month=1&year=2025
  @Get('calendar')
  async getCalendar(
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const now = new Date();
    const m = month ? parseInt(month) : now.getMonth() + 1;
    const y = year ? parseInt(year) : now.getFullYear();
    return this.produzioneService.getCalendarData(m, y);
  }

  // GET /produzione/today
  @Get('today')
  async getToday() {
    return this.produzioneService.getTodayStats();
  }

  // GET /produzione/week
  @Get('week')
  async getWeek() {
    return this.produzioneService.getWeekStats();
  }

  // GET /produzione/month?month=...&year=...
  @Get('month')
  async getMonth(
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const m = month ? parseInt(month) : undefined;
    const y = year ? parseInt(year) : undefined;
    return this.produzioneService.getMonthStats(m, y);
  }

  // GET /produzione/trend?days=30
  @Get('trend')
  async getTrend(@Query('days') days: string) {
    const numDays = days ? parseInt(days) : 30;
    return this.produzioneService.getTrendData(numDays);
  }

  // GET /produzione/machine-performance?startDate=...&endDate=...
  @Get('machine-performance')
  async getMachinePerformance(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.produzioneService.getMachinePerformance(startDate, endDate);
  }

  // GET /produzione/comparison?month1=...&year1=...&month2=...&year2=...
  @Get('comparison')
  async getComparison(
    @Query('month1') month1: string,
    @Query('year1') year1: string,
    @Query('month2') month2: string,
    @Query('year2') year2: string,
  ) {
    const now = new Date();
    const m2 = month2 ? parseInt(month2) : now.getMonth() + 1;
    const y2 = year2 ? parseInt(year2) : now.getFullYear();

    // Previous month
    let m1 = month1 ? parseInt(month1) : m2 - 1;
    let y1 = year1 ? parseInt(year1) : y2;
    if (m1 === 0) {
      m1 = 12;
      y1 = y1 - 1;
    }

    return this.produzioneService.getComparison(m1, y1, m2, y2);
  }

  // GET /produzione/pdf/:date - Generate PDF report
  @Get('pdf/:date')
  async generatePdf(@Param('date') date: string, @Res() res: Response) {
    const pdfBuffer = await this.produzioneService.generatePdf(date);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="PRODUZIONE_${date}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }

  // GET /produzione/date/:date - MUST be after all static routes
  @Get('date/:date')
  async getByDate(@Param('date') date: string) {
    return this.produzioneService.getByDate(date);
  }

  // POST /produzione/date/:date
  @Post('date/:date')
  async upsertByDate(
    @Param('date') date: string,
    @Body() data: any,
    @Request() req,
  ) {
    return this.produzioneService.upsert(date, data, req.user.id);
  }

  // PUT /produzione/date/:date (alias for POST)
  @Put('date/:date')
  async updateByDate(
    @Param('date') date: string,
    @Body() data: any,
    @Request() req,
  ) {
    return this.produzioneService.upsert(date, data, req.user.id);
  }
}
