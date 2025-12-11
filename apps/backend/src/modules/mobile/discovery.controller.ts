import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';

@Controller('discovery')
export class DiscoveryController {
  /**
   * Endpoint discovery - Risponde con info server per identificazione
   * Accessibile senza autenticazione per permettere la discovery
   */
  @Get()
  @Public()
  discover() {
    return {
      success: true,
      service: 'CoreGREJS',
      version: '1.0',
      app_name: process.env.APP_NAME || 'CoreGREJS',
      timestamp: new Date().toISOString(),
      server_info: {
        hostname: require('os').hostname(),
        node_version: process.version,
        platform: process.platform,
      },
    };
  }

  /**
   * Health check endpoint - Verifica stato server
   */
  @Get('health')
  @Public()
  health() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'CoreGREJS',
      database: 'connected', // TODO: add real DB check if needed
    };
  }

  /**
   * Ping endpoint - Risposta velocissima per network scan
   */
  @Get('ping')
  @Public()
  ping() {
    return {
      pong: true,
      service: 'CoreGREJS',
      timestamp: Math.floor(Date.now() / 1000),
    };
  }
}
