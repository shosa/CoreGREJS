import { Controller, Get, Query } from '@nestjs/common';
import { QualityApiService } from './quality-api.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('operators')
export class OperatorsController {
  constructor(private readonly qualityApiService: QualityApiService) {}

  /**
   * API per ottenere taglie per numerata
   * GET /api/operators/taglie?nu=UF
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

    // L'app si aspetta un array diretto con field in formato P01, P02, etc.
    const taglieWithPFormat = result.taglie.map((t) => ({
      numero: t.numero,
      nome: t.nome,
      field: `P${String(t.numero).padStart(2, '0')}`,
    }));

    return {
      status: 'success',
      message: 'Taglie recuperate con successo',
      data: taglieWithPFormat,
    };
  }
}
