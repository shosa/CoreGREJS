import { Controller, Get, Post, Body, Query, Headers } from '@nestjs/common';
import { MobileApiService } from './mobile-api.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('mobile')
export class MobileApiController {
  constructor(private readonly mobileApiService: MobileApiService) {}

  /**
   * Login unificato per tutte le app mobile
   * POST /api/mobile/login
   */
  @Post('login')
  @Public()
  async login(
    @Body() body: { action: string; username: string; password: string; app_type?: string },
    @Headers('x-app-type') appTypeHeader?: string,
  ) {
    const appType = body.app_type || appTypeHeader || 'quality';
    return this.mobileApiService.login(body.username, body.password, appType);
  }

  /**
   * Profilo operatore con statistiche app-specific
   * GET /api/mobile/profile?id=1
   */
  @Get('profile')
  async getProfile(
    @Query('id') id: string,
    @Headers('x-app-type') appType?: string,
  ) {
    return this.mobileApiService.getProfile(parseInt(id), appType || 'quality');
  }

  /**
   * Riepilogo giornaliero per app specifica
   * GET /api/mobile/daily-summary?id=1&data=2025-09-19
   */
  @Get('daily-summary')
  async getDailySummary(
    @Query('id') id: string,
    @Query('data') data: string,
    @Headers('x-app-type') appType?: string,
  ) {
    return this.mobileApiService.getDailySummary(
      parseInt(id),
      data,
      appType || 'quality',
    );
  }

  /**
   * Dati sistema (reparti, linee, taglie, laboratori, etc.)
   * GET /api/mobile/system-data?type=all|reparti|quality|repairs
   */
  @Get('system-data')
  @Public()
  async getSystemData(
    @Query('type') type: string = 'all',
    @Query('nu') nu?: string,
  ) {
    return this.mobileApiService.getSystemData(type, nu);
  }

  /**
   * Verifica cartellino/commessa unificata
   * POST /api/mobile/check-data
   */
  @Post('check-data')
  async checkData(
    @Body() body: { type: string; value: string },
  ) {
    return this.mobileApiService.checkData(body.type, body.value);
  }
}
