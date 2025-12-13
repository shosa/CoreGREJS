import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { InworkService, CreateInworkOperatorDto, UpdateInworkOperatorDto } from './inwork.service';

@Controller('inwork')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InworkController {
  constructor(private readonly inworkService: InworkService) {}

  @Get('operators')
  @RequirePermissions('admin')
  async getAllOperators() {
    return this.inworkService.getAllOperators();
  }

  @Get('operators/:id')
  @RequirePermissions('admin')
  async getOperatorById(@Param('id', ParseIntPipe) id: number) {
    return this.inworkService.getOperatorById(id);
  }

  @Post('operators')
  @RequirePermissions('admin')
  async createOperator(@Body() data: CreateInworkOperatorDto) {
    return this.inworkService.createOperator(data);
  }

  @Put('operators/:id')
  @RequirePermissions('admin')
  async updateOperator(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateInworkOperatorDto,
  ) {
    return this.inworkService.updateOperator(id, data);
  }

  @Delete('operators/:id')
  @RequirePermissions('admin')
  async deleteOperator(@Param('id', ParseIntPipe) id: number) {
    return this.inworkService.deleteOperator(id);
  }

  @Post('operators/:id/toggle-status')
  @RequirePermissions('admin')
  async toggleOperatorStatus(@Param('id', ParseIntPipe) id: number) {
    return this.inworkService.toggleOperatorStatus(id);
  }

  @Get('modules')
  @RequirePermissions('admin')
  async getAvailableModules() {
    return this.inworkService.getAvailableModules();
  }

  @Get('modules/all')
  @RequirePermissions('admin')
  async getAllModules() {
    return this.inworkService.getAllModules();
  }

  @Post('modules')
  @RequirePermissions('admin')
  async createModule(@Body() data: { moduleId: string; moduleName: string; descrizione?: string; ordine?: number }) {
    return this.inworkService.createModule(data);
  }

  @Put('modules/:id')
  @RequirePermissions('admin')
  async updateModule(@Param('id', ParseIntPipe) id: number, @Body() data: any) {
    return this.inworkService.updateModule(id, data);
  }

  @Post('modules/:id/toggle')
  @RequirePermissions('admin')
  async toggleModule(@Param('id', ParseIntPipe) id: number) {
    return this.inworkService.toggleModule(id);
  }
}
