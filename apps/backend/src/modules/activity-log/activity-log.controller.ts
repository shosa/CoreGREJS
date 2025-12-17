import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ActivityLogService } from './activity-log.service';

@ApiTags('Activity Log')
@ApiBearerAuth()
@Controller('activity-log')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('log')
export class ActivityLogController {
  constructor(private activityLogService: ActivityLogService) {}

  @Get()
  async getLogs(
    @Query('userId') userId?: string,
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('entity') entity?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.activityLogService.getLogs({
      userId: userId ? parseInt(userId) : undefined,
      module,
      action,
      entity,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  @Get('stats')
  async getStats(
    @Query('userId') userId?: string,
    @Query('module') module?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.activityLogService.getStats({
      userId: userId ? parseInt(userId) : undefined,
      module,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('filters')
  async getFilters() {
    return this.activityLogService.getAvailableFilters();
  }
}
