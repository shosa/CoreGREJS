import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WidgetsService } from './widgets.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Widgets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('widgets')
export class WidgetsController {
  constructor(private widgetsService: WidgetsService) {}

  @Get('available')
  getAvailable() {
    return this.widgetsService.getAvailableWidgets();
  }

  @Get('user')
  getUserWidgets(@Request() req) {
    return this.widgetsService.getUserWidgets(req.user.userId);
  }

  @Post('user')
  saveUserWidgets(@Request() req, @Body() data: { widgets: any[] }) {
    return this.widgetsService.saveUserWidgets(req.user.userId, data.widgets);
  }

  @Get('dashboard/stats')
  getDashboardStats() {
    return this.widgetsService.getDashboardStats();
  }

  @Get('dashboard/activities')
  getRecentActivities() {
    return this.widgetsService.getRecentActivities();
  }
}
