import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Query,
  Param,
  UseGuards,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LogActivity } from '../../common/decorators/log-activity.decorator';
import { JobsService, JobStatus } from './jobs.service';
import { JobsQueueService } from './jobs.queue';
import { StorageService } from '../storage/storage.service';
import * as archiver from 'archiver';
import { PDFDocument } from 'pdf-lib';

@ApiTags('Jobs')
@ApiBearerAuth()
@Controller('jobs')
@UseGuards(JwtAuthGuard)
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly jobsQueueService: JobsQueueService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  @LogActivity({ module: 'jobs', action: 'enqueue', entity: 'Job', description: 'Accodamento nuovo job' })
  async enqueue(
    @Body() body: { type: string; payload: any },
    @Req() req: Request,
  ) {
    if (!body?.type) {
      throw new BadRequestException('Tipo job mancante');
    }
    const userId = (req as any).user?.userId;
    const job = await this.jobsQueueService.enqueue(body.type, body.payload || {}, userId);
    return { jobId: job.id, status: job.status };
  }

  @Get()
  async list(
    @Req() req: Request,
    @Query('status') status?: JobStatus,
  ) {
    const userId = (req as any).user?.userId;
    return this.jobsService.listJobs(userId, status);
  }

  @Get(':id')
  async detail(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.userId;
    return this.jobsService.getJob(id, userId);
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const userId = (req as any).user?.userId;
    const job = await this.jobsService.getJob(id, userId);

    if (!job.outputPath) {
      throw new BadRequestException('File non pronto o non disponibile');
    }

    try {
      res.setHeader('Content-Disposition', `attachment; filename="${job.outputName || 'output'}"`);
      if (job.outputMime) {
        res.setHeader('Content-Type', job.outputMime);
      }

      // Download from MinIO
      const stream = await this.storageService.getFileStream(job.outputPath);
      stream.pipe(res);
    } catch (error) {
      // Se il file non esiste più, restituisci un messaggio chiaro
      if (error.code === 'FILE_NOT_FOUND' || error.statusCode === 404) {
        throw new BadRequestException('File non più disponibile');
      }
      throw error;
    }
  }

  @Delete(':id')
  @LogActivity({ module: 'jobs', action: 'delete', entity: 'Job', description: 'Eliminazione job' })
  async delete(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.userId;
    const job = await this.jobsService.getJob(id, userId);

    // Remove file from MinIO
    if (job.outputPath) {
      try {
        await this.storageService.deleteFile(job.outputPath);
      } catch (e) {
        // ignore if file doesn't exist
      }
    }

    await this.jobsService.deleteJob(id, userId);
    return { deleted: true };
  }

  @Post('merge-pdf')
  @LogActivity({ module: 'jobs', action: 'merge_pdf', entity: 'Job', description: 'Merge PDF da job multipli' })
  async mergePdf(@Body() body: { ids: string[] }, @Req() req: Request, @Res() res: Response) {
    const userId = (req as any).user?.userId;
    const ids = body.ids || [];
    if (!ids.length) throw new BadRequestException('Nessun job selezionato');

    const jobs = await this.jobsService.findByIdsForUser(ids, userId);
    if (jobs.length === 0) throw new BadRequestException('Nessun job valido trovato');

    const pdfJobs = jobs.filter(j => j.outputMime === 'application/pdf' && j.outputPath);
    if (pdfJobs.length === 0) throw new BadRequestException('Selezione non valida per merge PDF');

    const merged = await PDFDocument.create();
    for (const job of pdfJobs) {
      // Download from MinIO
      const bytes = await this.storageService.getFileBuffer(job.outputPath!);
      const doc = await PDFDocument.load(bytes);
      const copied = await merged.copyPages(doc, doc.getPageIndices());
      copied.forEach(p => merged.addPage(p));
    }
    const mergedBytes = await merged.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="merge.pdf"');
    res.end(Buffer.from(mergedBytes));
  }

  // ── ADMIN endpoints ────────────────────────────────────────────────────────

  @Get('admin/all')
  @LogActivity({ module: 'jobs', action: 'admin_list', entity: 'Job', description: 'Lista admin: tutti i job' })
  async adminListAll(@Query('status') status?: JobStatus) {
    return this.jobsService.listAllJobs(status);
  }

  @Delete('admin/:id')
  @LogActivity({ module: 'jobs', action: 'admin_delete', entity: 'Job', description: 'Eliminazione admin job' })
  async adminDelete(@Param('id') id: string) {
    const job = await this.jobsService.getJobAdmin(id);
    if (job.outputPath) {
      await this.storageService.deleteFile(job.outputPath).catch(() => {});
    }
    await this.jobsService.deleteJobAdmin(id);
    return { deleted: true };
  }

  @Post('zip')
  @LogActivity({ module: 'jobs', action: 'zip', entity: 'Job', description: 'Creazione ZIP da job multipli' })
  async zipFiles(@Body() body: { ids: string[] }, @Req() req: Request, @Res() res: Response) {
    const userId = (req as any).user?.userId;
    const ids = body.ids || [];
    if (!ids.length) throw new BadRequestException('Nessun job selezionato');

    const jobs = await this.jobsService.findByIdsForUser(ids, userId);
    if (jobs.length === 0) throw new BadRequestException('Nessun job valido trovato');

    const archive = archiver('zip', { zlib: { level: 9 } });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="files.zip"');
    archive.pipe(res);

    for (const job of jobs) {
      if (job.outputPath) {
        // Download from MinIO

        const stream = await this.storageService.getFileStream(job.outputPath);
        archive.append(stream, { name: job.outputName || job.id });
      }
    }

    archive.finalize();
  }
}
