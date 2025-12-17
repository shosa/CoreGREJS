import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { QualityApiService } from './quality-api.service';
import { Public } from '../../common/decorators/public.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('Mobile - Quality API')
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

  /**
   * API per ottenere foto da MinIO (presigned URL)
   * GET /api/quality/photo/:objectName
   */
  @Get('photo/:objectName(*)')
  @Public()
  async getPhoto(@Param('objectName') objectName: string) {
    return this.qualityApiService.getPhoto(objectName);
  }

  /**
   * API per streammare foto da MinIO (alternativa)
   * GET /api/quality/photo-stream/:objectName
   */
  @Get('photo-stream/:objectName(*)')
  @Public()
  async getPhotoStream(
    @Param('objectName') objectName: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const stream = await this.qualityApiService.getPhotoStream(objectName);
    res.set({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'max-age=3600',
    });
    return new StreamableFile(stream);
  }
}
