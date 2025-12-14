import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DataManagementService } from './data-management.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Data Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('dbsql')
@Controller('data-management')
export class DataManagementController {
  constructor(private readonly dataManagementService: DataManagementService) {}

  @Get('tables')
  getAvailableTables() {
    return this.dataManagementService.getAvailableTables();
  }

  @Get('tables/:tableName/schema')
  getTableSchema(@Param('tableName') tableName: string) {
    return this.dataManagementService.getTableSchema(tableName);
  }

  @Get('tables/:tableName/data')
  getTableData(
    @Param('tableName') tableName: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.dataManagementService.getTableData(tableName, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      search,
      sortBy,
      sortOrder: sortOrder || 'asc',
    });
  }

  @Get('tables/:tableName/record/:id')
  getRecord(
    @Param('tableName') tableName: string,
    @Param('id') id: string,
  ) {
    return this.dataManagementService.getRecord(tableName, id);
  }

  @Put('tables/:tableName/record/:id')
  updateRecord(
    @Param('tableName') tableName: string,
    @Param('id') id: string,
    @Body() data: any,
    @Request() req,
  ) {
    return this.dataManagementService.updateRecord(tableName, id, data, req.user.userId);
  }

  @Delete('tables/:tableName/record/:id')
  deleteRecord(
    @Param('tableName') tableName: string,
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.dataManagementService.deleteRecord(tableName, id, req.user.userId);
  }

  @Get('audit-log')
  getAuditLog(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('tableName') tableName?: string,
  ) {
    return this.dataManagementService.getAuditLog({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      tableName,
    });
  }
}
