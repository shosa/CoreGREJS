import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { SettingsService } from './settings.service';

/**
 * Controller pubblico (senza JwtAuthGuard) per servire le immagini logo.
 * Il browser le usa direttamente come <img src> senza dover mandare il token JWT.
 */
@Controller('settings/logo')
export class LogoPublicController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get(':tipo/image')
  async serveLogoImage(
    @Param('tipo') tipo: string,
    @Res() res: Response,
  ) {
    if (!['documenti', 'icona'].includes(tipo)) {
      return res.status(400).send('Tipo non valido');
    }
    await this.settingsService.pipeLogoImage(tipo as 'documenti' | 'icona', res);
  }
}
