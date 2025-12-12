import {
  Controller,
  Post,
  Body,
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
   * API per ottenere dettagli completi cartellino
   * POST /api/quality/cartellino-details
   */
  @Post('cartellino-details')
  @Public()
  async getCartellinoDetails(@Body() body: { cartellino: string }) {
    return this.qualityApiService.getCartellinoDetails(body.cartellino);
  }

  /**
   * API per ottenere opzioni per form quality control
   * POST /api/quality/options
   */
  @Post('options')
  @Public()
  async getOptions(@Body() body: { cartellino?: string }) {
    return this.qualityApiService.getOptions(body.cartellino);
  }

  /**
   * API per salvare controlli HERMES CQ
   * POST /api/quality/save-hermes-cq
   */
  @Post('save-hermes-cq')
  @Public()
  async saveHermesCq(@Body() data: any) {
    return this.qualityApiService.saveHermesCq(data);
  }

  /**
   * API per upload foto eccezioni
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
}
