import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { RiparazioniService } from './riparazioni.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Prisma } from '@prisma/client';

@Controller('riparazioni')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('riparazioni')
export class RiparazioniController {
  constructor(private readonly riparazioniService: RiparazioniService) {}

  // ==================== RIPARAZIONI ESTERNE ====================

  /**
   * GET /riparazioni/stats
   * Get dashboard statistics
   */
  @Get('stats')
  async getStats() {
    return this.riparazioniService.getStats();
  }

  /**
   * GET /riparazioni
   * Get all riparazioni with pagination and filters
   */
  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('completa') completa?: string,
    @Query('laboratorioId') laboratorioId?: string,
    @Query('repartoId') repartoId?: string,
  ) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.RiparazioneWhereInput = {};

    // Search filter
    if (search) {
      where.OR = [
        { idRiparazione: { contains: search } },
        { cartellino: { contains: search } },
        { causale: { contains: search } },
      ];
    }

    // Completa filter
    if (completa !== undefined) {
      where.completa = completa === 'true';
    }

    // Laboratorio filter
    if (laboratorioId) {
      where.laboratorioId = parseInt(laboratorioId);
    }

    // Reparto filter
    if (repartoId) {
      where.repartoId = parseInt(repartoId);
    }

    const { data, total } = await this.riparazioniService.findAll({
      skip,
      take: limitNum,
      where,
      orderBy: { data: 'desc' },
    });

    return {
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * GET /riparazioni/next-id
   * Get next available idRiparazione
   */
  @Get('next-id')
  async getNextId() {
    const nextId = await this.riparazioniService.generateNextIdRiparazione();
    return { idRiparazione: nextId };
  }

  /**
   * GET /riparazioni/cartellino/:cartellino
   * Get cartellino data from core_dati
   */
  @Get('cartellino/:cartellino')
  async getCartellinoData(@Param('cartellino') cartellino: string) {
    return this.riparazioniService.getCartellinoData(cartellino);
  }

  /**
   * GET /riparazioni/id/:idRiparazione
   * Get riparazione by custom ID
   */
  @Get('id/:idRiparazione')
  async findByIdRiparazione(@Param('idRiparazione') idRiparazione: string) {
    return this.riparazioniService.findByIdRiparazione(idRiparazione);
  }

  /**
   * GET /riparazioni/:id
   * Get riparazione by numeric ID
   */
  @Get(':id(\\d+)')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.riparazioniService.findOne(id);
  }

  /**
   * POST /riparazioni
   * Create new riparazione
   */
  @Post()
  async create(@Body() createDto: any) {
    // Convert DTO to Prisma input
    const data: Prisma.RiparazioneCreateInput = {
      idRiparazione: createDto.idRiparazione,
      cartellino: createDto.cartellino,
      numerata: createDto.numerataId ? { connect: { id: createDto.numerataId } } : undefined,
      user: createDto.userId ? { connect: { id: createDto.userId } } : undefined,
      p01: createDto.p01 || 0,
      p02: createDto.p02 || 0,
      p03: createDto.p03 || 0,
      p04: createDto.p04 || 0,
      p05: createDto.p05 || 0,
      p06: createDto.p06 || 0,
      p07: createDto.p07 || 0,
      p08: createDto.p08 || 0,
      p09: createDto.p09 || 0,
      p10: createDto.p10 || 0,
      p11: createDto.p11 || 0,
      p12: createDto.p12 || 0,
      p13: createDto.p13 || 0,
      p14: createDto.p14 || 0,
      p15: createDto.p15 || 0,
      p16: createDto.p16 || 0,
      p17: createDto.p17 || 0,
      p18: createDto.p18 || 0,
      p19: createDto.p19 || 0,
      p20: createDto.p20 || 0,
      causale: createDto.causale,
      laboratorio: createDto.laboratorioId ? { connect: { id: createDto.laboratorioId } } : undefined,
      reparto: createDto.repartoId ? { connect: { id: createDto.repartoId } } : undefined,
      linea: createDto.lineaId ? { connect: { id: createDto.lineaId } } : undefined,
      data: createDto.data ? new Date(createDto.data) : new Date(),
      note: createDto.note,
    };

    return this.riparazioniService.create(data);
  }

  /**
   * PUT /riparazioni/:id
   * Update riparazione
   */
  @Put(':id(\\d+)')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: any,
  ) {
    const data: Prisma.RiparazioneUpdateInput = {};

    if (updateDto.cartellino !== undefined) data.cartellino = updateDto.cartellino;
    if (updateDto.numerataId !== undefined) {
      data.numerata = updateDto.numerataId ? { connect: { id: updateDto.numerataId } } : { disconnect: true };
    }
    if (updateDto.causale !== undefined) data.causale = updateDto.causale;
    if (updateDto.note !== undefined) data.note = updateDto.note;

    // Update p01-p20 fields
    for (let i = 1; i <= 20; i++) {
      const field = `p${i.toString().padStart(2, '0')}`;
      if (updateDto[field] !== undefined) {
        data[field] = updateDto[field];
      }
    }

    if (updateDto.laboratorioId !== undefined) {
      data.laboratorio = updateDto.laboratorioId ? { connect: { id: updateDto.laboratorioId } } : { disconnect: true };
    }
    if (updateDto.repartoId !== undefined) {
      data.reparto = updateDto.repartoId ? { connect: { id: updateDto.repartoId } } : { disconnect: true };
    }
    if (updateDto.lineaId !== undefined) {
      data.linea = updateDto.lineaId ? { connect: { id: updateDto.lineaId } } : { disconnect: true };
    }

    return this.riparazioniService.update(id, data);
  }

  /**
   * PUT /riparazioni/:id/complete
   * Mark riparazione as completed
   */
  @Put(':id(\\d+)/complete')
  async complete(@Param('id', ParseIntPipe) id: number) {
    return this.riparazioniService.complete(id);
  }

  /**
   * DELETE /riparazioni/:id
   * Delete riparazione
   */
  @Delete(':id(\\d+)')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.riparazioniService.remove(id);
    return { message: 'Riparazione eliminata con successo' };
  }

  // ==================== RIPARAZIONI INTERNE ====================

  /**
   * GET /riparazioni/interne/stats
   * Get dashboard statistics for riparazioni interne
   */
  @Get('interne/stats')
  async getStatsInterne() {
    return this.riparazioniService.getStatsInterne();
  }

  /**
   * GET /riparazioni/interne
   * Get all riparazioni interne
   */
  @Get('interne')
  async findAllInterne(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('completa') completa?: string,
  ) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.RiparazioneInternaWhereInput = {};

    // Search filter
    if (search) {
      where.OR = [
        { idRiparazione: { contains: search } },
        { cartellino: { contains: search } },
        { causale: { contains: search } },
      ];
    }

    // Completa filter
    if (completa !== undefined) {
      where.completa = completa === 'true';
    }

    const { data, total } = await this.riparazioniService.findAllInterne({
      skip,
      take: limitNum,
      where,
      orderBy: { data: 'desc' },
    });

    return {
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * GET /riparazioni/interne/next-id
   * Get next available idRiparazione for interne
   */
  @Get('interne/next-id')
  async getNextIdInterna() {
    const nextId = await this.riparazioniService.generateNextIdRiparazioneInterna();
    return { idRiparazione: nextId };
  }

  /**
   * GET /riparazioni/interne/:id
   * Get riparazione interna by ID
   */
  @Get('interne/:id(\\d+)')
  async findOneInterna(@Param('id', ParseIntPipe) id: number) {
    return this.riparazioniService.findOneInterna(id);
  }

  /**
   * POST /riparazioni/interne
   * Create new riparazione interna
   */
  @Post('interne')
  async createInterna(@Body() createDto: any) {
    const data: Prisma.RiparazioneInternaCreateInput = {
      idRiparazione: createDto.idRiparazione,
      cartellino: createDto.cartellino,
      numerata: createDto.numerataId ? { connect: { id: createDto.numerataId } } : undefined,
      user: createDto.userId ? { connect: { id: createDto.userId } } : undefined,
      p01: createDto.p01 || 0,
      p02: createDto.p02 || 0,
      p03: createDto.p03 || 0,
      p04: createDto.p04 || 0,
      p05: createDto.p05 || 0,
      p06: createDto.p06 || 0,
      p07: createDto.p07 || 0,
      p08: createDto.p08 || 0,
      p09: createDto.p09 || 0,
      p10: createDto.p10 || 0,
      p11: createDto.p11 || 0,
      p12: createDto.p12 || 0,
      p13: createDto.p13 || 0,
      p14: createDto.p14 || 0,
      p15: createDto.p15 || 0,
      p16: createDto.p16 || 0,
      p17: createDto.p17 || 0,
      p18: createDto.p18 || 0,
      p19: createDto.p19 || 0,
      p20: createDto.p20 || 0,
      causale: createDto.causale,
      causaDifetto: createDto.causaDifetto,
      repartoOrigine: createDto.repartoOrigine,
      repartoDestino: createDto.repartoDestino,
      operatoreApertura: createDto.operatoreApertura,
      data: createDto.data ? new Date(createDto.data) : new Date(),
      note: createDto.note,
      foto: createDto.foto,
    };

    return this.riparazioniService.createInterna(data);
  }

  /**
   * PUT /riparazioni/interne/:id
   * Update riparazione interna
   */
  @Put('interne/:id(\\d+)')
  async updateInterna(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: any,
  ) {
    const data: Prisma.RiparazioneInternaUpdateInput = {};

    if (updateDto.cartellino !== undefined) data.cartellino = updateDto.cartellino;
    if (updateDto.causale !== undefined) data.causale = updateDto.causale;
    if (updateDto.causaDifetto !== undefined) data.causaDifetto = updateDto.causaDifetto;
    if (updateDto.repartoOrigine !== undefined) data.repartoOrigine = updateDto.repartoOrigine;
    if (updateDto.repartoDestino !== undefined) data.repartoDestino = updateDto.repartoDestino;
    if (updateDto.operatoreApertura !== undefined) data.operatoreApertura = updateDto.operatoreApertura;
    if (updateDto.note !== undefined) data.note = updateDto.note;
    if (updateDto.foto !== undefined) data.foto = updateDto.foto;

    // Update p01-p20 fields
    for (let i = 1; i <= 20; i++) {
      const field = `p${i.toString().padStart(2, '0')}`;
      if (updateDto[field] !== undefined) {
        data[field] = updateDto[field];
      }
    }

    if (updateDto.numerataId !== undefined) {
      data.numerata = updateDto.numerataId ? { connect: { id: updateDto.numerataId } } : { disconnect: true };
    }

    return this.riparazioniService.updateInterna(id, data);
  }

  /**
   * PUT /riparazioni/interne/:id/complete
   * Mark riparazione interna as completed
   */
  @Put('interne/:id(\\d+)/complete')
  async completeInterna(
    @Param('id', ParseIntPipe) id: number,
    @Body('operatoreChiusura') operatoreChiusura?: string,
  ) {
    return this.riparazioniService.completeInterna(id, operatoreChiusura);
  }

  /**
   * DELETE /riparazioni/interne/:id
   * Delete riparazione interna
   */
  @Delete('interne/:id(\\d+)')
  async removeInterna(@Param('id', ParseIntPipe) id: number) {
    await this.riparazioniService.removeInterna(id);
    return { message: 'Riparazione interna eliminata con successo' };
  }

  // ==================== SUPPORT DATA ====================

  /**
   * GET /riparazioni/reparti
   * Get all reparti
   */
  @Get('reparti')
  async getReparti() {
    return this.riparazioniService.findAllReparti();
  }

  /**
   * GET /riparazioni/laboratori
   * Get all laboratori
   */
  @Get('laboratori')
  async getLaboratori() {
    return this.riparazioniService.findAllLaboratori();
  }

  /**
   * GET /riparazioni/linee
   * Get all linee
   */
  @Get('linee')
  async getLinee() {
    return this.riparazioniService.findAllLinee();
  }

  /**
   * GET /riparazioni/numerate
   * Get all numerate
   */
  @Get('numerate')
  async getNumerate() {
    return this.riparazioniService.findAllNumerate();
  }

  /**
   * GET /riparazioni/numerate/:id
   * Get numerata by ID
   */
  @Get('numerate/:id(\\d+)')
  async getNumerata(@Param('id', ParseIntPipe) id: number) {
    return this.riparazioniService.findNumerata(id);
  }

  /**
   * POST /riparazioni/laboratori
   * Create laboratorio
   */
  @Post('laboratori')
  async createLaboratorio(@Body() createDto: any) {
    const data: Prisma.LaboratorioCreateInput = {
      nome: createDto.nome,
      attivo: createDto.attivo ?? true,
    };
    return this.riparazioniService.createLaboratorio(data);
  }

  /**
   * PUT /riparazioni/laboratori/:id
   * Update laboratorio
   */
  @Put('laboratori/:id(\\d+)')
  async updateLaboratorio(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: any,
  ) {
    const data: Prisma.LaboratorioUpdateInput = {};
    if (updateDto.nome !== undefined) data.nome = updateDto.nome;
    if (updateDto.attivo !== undefined) data.attivo = updateDto.attivo;
    return this.riparazioniService.updateLaboratorio(id, data);
  }

  /**
   * DELETE /riparazioni/laboratori/:id
   * Delete laboratorio
   */
  @Delete('laboratori/:id(\\d+)')
  async deleteLaboratorio(@Param('id', ParseIntPipe) id: number) {
    await this.riparazioniService.deleteLaboratorio(id);
    return { message: 'Laboratorio eliminato con successo' };
  }

  /**
   * POST /riparazioni/reparti
   * Create reparto
   */
  @Post('reparti')
  async createReparto(@Body() createDto: any) {
    const data: Prisma.RepartoCreateInput = {
      nome: createDto.nome,
      ordine: createDto.ordine ?? 0,
      attivo: createDto.attivo ?? true,
    };
    return this.riparazioniService.createReparto(data);
  }

  /**
   * PUT /riparazioni/reparti/:id
   * Update reparto
   */
  @Put('reparti/:id(\\d+)')
  async updateReparto(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: any,
  ) {
    const data: Prisma.RepartoUpdateInput = {};
    if (updateDto.nome !== undefined) data.nome = updateDto.nome;
    if (updateDto.ordine !== undefined) data.ordine = updateDto.ordine;
    if (updateDto.attivo !== undefined) data.attivo = updateDto.attivo;
    return this.riparazioniService.updateReparto(id, data);
  }

  /**
   * DELETE /riparazioni/reparti/:id
   * Delete reparto
   */
  @Delete('reparti/:id(\\d+)')
  async deleteReparto(@Param('id', ParseIntPipe) id: number) {
    await this.riparazioniService.deleteReparto(id);
    return { message: 'Reparto eliminato con successo' };
  }

  /**
   * POST /riparazioni/numerate
   * Create numerata
   */
  @Post('numerate')
  async createNumerata(@Body() createDto: any) {
    const idNumerata = (createDto.idNumerata ?? '').toString().trim();
    if (!idNumerata || idNumerata.length > 2) {
      throw new BadRequestException('idNumerata deve avere massimo 2 caratteri');
    }

    const data: Prisma.NumerataCreateInput = {
      idNumerata,
      n01: createDto.n01,
      n02: createDto.n02,
      n03: createDto.n03,
      n04: createDto.n04,
      n05: createDto.n05,
      n06: createDto.n06,
      n07: createDto.n07,
      n08: createDto.n08,
      n09: createDto.n09,
      n10: createDto.n10,
      n11: createDto.n11,
      n12: createDto.n12,
      n13: createDto.n13,
      n14: createDto.n14,
      n15: createDto.n15,
      n16: createDto.n16,
      n17: createDto.n17,
      n18: createDto.n18,
      n19: createDto.n19,
      n20: createDto.n20,
    };
    return this.riparazioniService.createNumerata(data);
  }

  /**
   * PUT /riparazioni/numerate/:id
   * Update numerata
   */
  @Put('numerate/:id(\\d+)')
  async updateNumerata(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: any,
  ) {
    const data: Prisma.NumerataUpdateInput = {};
    if (updateDto.idNumerata !== undefined) {
      const idNumerata = updateDto.idNumerata?.toString().trim() ?? '';
      if (!idNumerata || idNumerata.length > 2) {
        throw new BadRequestException('idNumerata deve avere massimo 2 caratteri');
      }
      data.idNumerata = idNumerata;
    }
    for (let i = 1; i <= 20; i++) {
      const field = `n${String(i).padStart(2, '0')}`;
      if (updateDto[field] !== undefined) {
        data[field] = updateDto[field];
      }
    }
    return this.riparazioniService.updateNumerata(id, data);
  }

  /**
   * DELETE /riparazioni/numerate/:id
   * Delete numerata
   */
  @Delete('numerate/:id(\\d+)')
  async deleteNumerata(@Param('id', ParseIntPipe) id: number) {
    await this.riparazioniService.deleteNumerata(id);
    return { message: 'Numerata eliminata con successo' };
  }
}
