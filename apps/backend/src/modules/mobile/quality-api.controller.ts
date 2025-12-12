import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { QualityApiService } from './quality-api.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('quality')
export class QualityApiController {
  constructor(private readonly qualityApiService: QualityApiService) {}

  /**
   * API Login - ESATTO COME LEGACY login.php
   * POST /api/quality/login
   */
  @Post('login')
  @Public()
  async login(@Body() body: { action: string; username?: string; password?: string }) {
    if (body.action === 'get_users') {
      return this.qualityApiService.getUsers();
    } else if (body.action === 'login' && body.username && body.password) {
      return this.qualityApiService.loginUser(body.username, body.password);
    } else {
      return {
        status: 'error',
        message: 'Parametri mancanti o non validi',
      };
    }
  }

  /**
   * API per verificare esistenza cartellino - ESATTO COME LEGACY check_cartellino.php
   * POST /api/quality/check-cartellino
   */
  @Post('check-cartellino')
  @Public()
  async checkCartellino(@Body() body: { cartellino: string }) {
    return this.qualityApiService.checkCartellino(body.cartellino);
  }

  /**
   * API per ottenere dettagli completi cartellino - COME get_cartellino_details.php
   * POST /api/quality/cartellino-details
   */
  @Post('cartellino-details')
  @Public()
  async getCartellinoDetails(@Body() body: { cartellino: string }) {
    return this.qualityApiService.getCartellinoDetails(body.cartellino);
  }

  /**
   * API per verificare esistenza commessa - ESATTO COME LEGACY check_commessa.php
   * POST /api/quality/check-commessa
   */
  @Post('check-commessa')
  @Public()
  async checkCommessa(@Body() body: { commessa: string }) {
    return this.qualityApiService.checkCommessa(body.commessa);
  }

  /**
   * API per ottenere opzioni - ESATTO COME LEGACY get_options.php
   * POST /api/quality/options
   */
  @Post('options')
  @Public()
  async getOptions(@Body() body: { cartellino?: string }) {
    return this.qualityApiService.getOptions(body.cartellino);
  }

  /**
   * API per salvare controlli HERMES CQ - ESATTO COME LEGACY save_hermes_cq.php
   * POST /api/quality/save-hermes-cq
   */
  @Post('save-hermes-cq')
  @Public()
  async saveHermesCq(@Body() data: any) {
    return this.qualityApiService.saveHermesCq(data);
  }

  /**
   * API per riepilogo giornaliero operatore - ESATTO COME LEGACY get_operator_daily_summary.php
   * GET /api/quality/operator-daily-summary
   */
  @Get('operator-daily-summary')
  async getOperatorDailySummary(
    @Query('operatore') operatore: string,
    @Query('data') data?: string,
  ) {
    return this.qualityApiService.getOperatorDailySummary(operatore, data);
  }

  /**
   * API per dettagli record - ESATTO COME LEGACY get_record_details.php
   * GET /api/quality/record-details
   */
  @Get('record-details')
  async getRecordDetails(@Query('record_id') recordId: string) {
    return this.qualityApiService.getRecordDetails(parseInt(recordId));
  }

  /**
   * API per upload foto eccezioni - ESATTO COME LEGACY upload_eccezione_foto.php
   * POST /api/quality/upload-photo
   */
  @Post('upload-photo')
  @Public()
  @UseInterceptors(FileInterceptor('photo'))
  async uploadPhoto(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { cartellino_id: string; tipo_difetto: string; calzata?: string; note?: string },
  ) {
    return this.qualityApiService.uploadPhoto(file, body);
  }

  /**
   * API per ottenere taglie per numerata
   * GET /api/quality/taglie?nu=UF
   */
  @Get('taglie')
  @Public()
  async getTaglie(@Query('nu') nu: string) {
    if (!nu) {
      return {
        status: 'error',
        message: 'Parametro nu mancante',
      };
    }

    const result = await this.qualityApiService.getTaglieByNu(nu);
    return {
      status: 'success',
      message: 'Taglie recuperate con successo',
      data: {
        calzate: result.calzate,
        taglie: result.taglie,
      },
    };
  }
}
