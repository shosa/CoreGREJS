import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { LogActivity } from '../../common/decorators/log-activity.decorator';
import { InworkService, CreateInworkOperatorDto, UpdateInworkOperatorDto } from './inwork.service';

@ApiTags('Inwork')
@ApiBearerAuth()
@Controller('inwork')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InworkController {
  constructor(private readonly inworkService: InworkService) {}

  @Get('operators')
  @RequirePermissions('inwork')
  async getAllOperators() {
    return this.inworkService.getAllOperators();
  }

  @Get('operators/:id')
  @RequirePermissions('inwork')
  async getOperatorById(@Param('id', ParseIntPipe) id: number) {
    return this.inworkService.getOperatorById(id);
  }

  @Post('operators')
  @RequirePermissions('inwork')
  @LogActivity({ module: 'inwork', action: 'create', entity: 'Operator', description: 'Creazione operatore InWork' })
  async createOperator(@Body() data: CreateInworkOperatorDto) {
    return this.inworkService.createOperator(data);
  }

  @Put('operators/:id')
  @RequirePermissions('inwork')
  @LogActivity({ module: 'inwork', action: 'update', entity: 'Operator', description: 'Modifica operatore InWork' })
  async updateOperator(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateInworkOperatorDto,
  ) {
    return this.inworkService.updateOperator(id, data);
  }

  @Delete('operators/:id')
  @RequirePermissions('inwork')
  @LogActivity({ module: 'inwork', action: 'delete', entity: 'Operator', description: 'Eliminazione operatore InWork' })
  async deleteOperator(@Param('id', ParseIntPipe) id: number) {
    return this.inworkService.deleteOperator(id);
  }

  @Post('operators/:id/toggle-status')
  @RequirePermissions('inwork')
  @LogActivity({ module: 'inwork', action: 'toggle_status', entity: 'Operator', description: 'Toggle stato operatore InWork' })
  async toggleOperatorStatus(@Param('id', ParseIntPipe) id: number) {
    return this.inworkService.toggleOperatorStatus(id);
  }

  @Get('modules')
  @RequirePermissions('inwork')
  async getAvailableModules() {
    return this.inworkService.getAvailableModules();
  }

  @Get('modules/all')
  @RequirePermissions('inwork')
  async getAllModules() {
    return this.inworkService.getAllModules();
  }

  @Post('modules')
  @RequirePermissions('inwork')
  @LogActivity({ module: 'inwork', action: 'create', entity: 'Module', description: 'Creazione modulo InWork' })
  async createModule(@Body() data: { moduleId: string; moduleName: string; descrizione?: string; ordine?: number }) {
    return this.inworkService.createModule(data);
  }

  @Put('modules/:id')
  @RequirePermissions('inwork')
  @LogActivity({ module: 'inwork', action: 'update', entity: 'Module', description: 'Modifica modulo InWork' })
  async updateModule(@Param('id', ParseIntPipe) id: number, @Body() data: any) {
    return this.inworkService.updateModule(id, data);
  }

  @Post('modules/:id/toggle')
  @RequirePermissions('inwork')
  @LogActivity({ module: 'inwork', action: 'toggle', entity: 'Module', description: 'Toggle modulo InWork' })
  async toggleModule(@Param('id', ParseIntPipe) id: number) {
    return this.inworkService.toggleModule(id);
  }
}
