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
import { PrismaService } from '../../prisma/prisma.service';
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
    private readonly prisma: PrismaService,
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

  @Post(':id/print')
  async printJob(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() body: { cupsName?: string },
  ) {
    const userId = (req as any).user?.userId;
    const job = await this.jobsService.getJob(id, userId);

    if (!job.outputPath || job.outputMime !== 'application/pdf') {
      throw new BadRequestException('Il job non ha un file PDF disponibile');
    }

    // Risolvi stampante: usa quella specificata oppure il default
    let printerName = body?.cupsName?.trim();
    if (!printerName) {
      const defaultPrinter = await this.prisma.printerConfig.findFirst({
        where: { isDefault: true },
      });
      if (!defaultPrinter) {
        throw new BadRequestException('Nessuna stampante default configurata');
      }
      printerName = defaultPrinter.cupsName;
    }

    // Scarica il PDF da MinIO
    const pdfBytes = await this.storageService.getFileBuffer(job.outputPath);

    // Costruisce payload IPP Print-Job
    const safePrinterName = printerName.replace(/[^a-zA-Z0-9_.\-]/g, '');
    const printerUri = `ipp://localhost/printers/${safePrinterName}`;
    const jobName = job.outputName || `job-${id}`;
    const userName = 'coregrejs';

    const encodeStr = (s: string) => {
      const buf = Buffer.alloc(2 + s.length);
      buf.writeUInt16BE(s.length, 0);
      buf.write(s, 2, 'utf8');
      return buf;
    };

    const attr = (tag: number, name: string, valueBuf: Buffer) =>
      Buffer.concat([
        Buffer.from([tag]),
        encodeStr(name),
        valueBuf,
      ]);

    const charsetValue = encodeStr('utf-8');
    const langValue = encodeStr('it-IT');
    const uriValue = encodeStr(printerUri);
    const userValue = encodeStr(userName);
    const jobNameValue = encodeStr(jobName);

    const header = Buffer.from([
      0x02, 0x00,       // IPP version 2.0
      0x00, 0x02,       // Print-Job operation
      0x00, 0x00, 0x00, 0x01, // request-id = 1
      0x01,             // operation-attributes-tag
    ]);

    const operationAttrs = Buffer.concat([
      attr(0x47, 'attributes-charset', charsetValue),
      attr(0x48, 'attributes-natural-language', langValue),
      attr(0x45, 'printer-uri', uriValue),
      attr(0x42, 'requesting-user-name', userValue),
      attr(0x42, 'job-name', jobNameValue),
    ]);

    const endTag = Buffer.from([0x03]);

    const ippPayload = Buffer.concat([header, operationAttrs, endTag, pdfBytes]);

    const cupsUrl = `http://core-nginx:631/printers/${safePrinterName}`;
    const response = await fetch(cupsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/ipp' },
      body: ippPayload,
    });

    if (!response.ok && response.status !== 200) {
      const text = await response.text().catch(() => '');
      throw new BadRequestException(`Errore stampa CUPS: HTTP ${response.status} — ${text.substring(0, 200)}`);
    }

    return { printed: true, printer: safePrinterName, jobName };
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
