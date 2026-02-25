import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, JobsOptions, Job } from 'bullmq';
import { JobsService } from './jobs.service';
import { TrackingService } from '../tracking/tracking.service';
import { ProduzioneService } from '../produzione/produzione.service';
import { ExportService } from '../export/export.service';
import { StorageService } from '../storage/storage.service';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import PDFDocument = require('pdfkit');
import { jobHandlers } from './handlers';
import { JobHandlerHelpers } from './types';

const QUEUE_NAME = 'coregre-jobs';



type BaseReportPayload = {
  dataFrom?: string;
  dataTo?: string;
  repartoId?: number;
  tipoDocumento?: string;
  linea?: string;
};

export type ReportPayload =
  | { lots: string[] }
  | { cartelli: number[] }
  | { date: string }
  | { csvData: any[] }
  | (BaseReportPayload & {
      groupBy?: 'reparto' | 'linea' | 'tipoDocumento' | 'mese';
      includeArticoliPerReparto?: boolean;
      showUncorrelatedCosts?: boolean;
      showCostoTomaia?: boolean;
    })
  | (BaseReportPayload & {
      includeDetails?: boolean;
      showUncorrelatedCosts?: boolean;
      showCostoTomaia?: boolean;
    })
  | {
      anno: number;
      mese: number;
      tipoDocumento?: string;
      linea?: string;
      includeProduzione?: boolean;
    };

/* ------------------------------------------------------------------ */

@Injectable()
export class JobsQueueService implements OnModuleInit, OnModuleDestroy {
  private queue: Queue;
  private worker: Worker;
  private readonly logger = new Logger(JobsQueueService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly jobsService: JobsService,
    private readonly trackingService: TrackingService,
    private readonly produzioneService: ProduzioneService,
    private readonly exportService: ExportService,
    private readonly storageService: StorageService,
  ) {}

  onModuleInit() {
    const connection = {
      host: this.configService.get<string>('REDIS_HOST', '127.0.0.1'),
      port: Number(this.configService.get<string>('REDIS_PORT', '6379')),
      password: this.configService.get<string>(
        'REDIS_PASSWORD',
        'coresuite_redis',
      ),
    };

    this.queue = new Queue(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      } as JobsOptions,
    });

    this.worker = new Worker(
      QUEUE_NAME,
      async (job) => this.handleJob(job),
      { connection },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} failed: ${err?.message}`);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  async enqueue(type: string, payload: ReportPayload, userId: number) {
    const jobRecord = await this.jobsService.createJob(userId, type, payload);

    await this.queue.add(type, {
      ...payload,
      userId,
      jobId: jobRecord.id,
    });

    return jobRecord;
  }

  private async handleJob(job: Job) {
    const { jobId, userId } = job.data as {
      jobId: string;
      userId: number;
    };

    try {
      await this.jobsService.markRunning(jobId);

      const handler = jobHandlers[job.name];
      if (!handler) {
        throw new Error(`Tipo job non gestito: ${job.name}`);
      }

      const helpers: JobHandlerHelpers = {
        trackingService: this.trackingService,
        produzioneService: this.produzioneService,
        exportService: this.exportService,
        storageService: this.storageService,
        ensureOutputPath: this.ensureOutputPath,
        waitForPdf: this.waitForPdf,
      };

      const output = await handler(job.data, helpers);

      if (!output) {
        await this.jobsService.markDone(jobId, {});
        return;
      }

      const filePath = output.outputPath || output.fullPath;

      if (filePath && fs.existsSync(filePath)) {
        const fileName =
          output.outputName ||
          output.fileName ||
          path.basename(filePath);

        const objectName =
          this.storageService.generateJobObjectName(
            userId,
            jobId,
            fileName,
          );

        await this.storageService.uploadFile(objectName, filePath, {
          'Content-Type':
            output.outputMime ||
            output.mime ||
            'application/octet-stream',
          'user-id': String(userId),
          'job-id': jobId,
        });

        try {
          const jobDir = path.join(
            process.cwd(),
            'storage',
            'jobs',
            String(userId),
            jobId,
          );
          await fsp.rm(jobDir, { recursive: true, force: true });
          this.logger.log(`Temp directory cleaned: ${jobDir}`);
        } catch (e: any) {
          this.logger.warn(
            `Failed to delete temp directory: ${e.message}`,
          );
        }

        output.outputPath = objectName;

        if (output.fullPath) {
          delete output.fullPath;
        }
      }

      await this.jobsService.markDone(jobId, output);
    } catch (err: any) {
      await this.jobsService.markFailed(
        jobId,
        err?.message || 'Errore job',
      );
      throw err;
    }
  }

  private ensureOutputPath = async (
    userId: number,
    jobId: string,
    fileName: string,
  ) => {
    const storageDir = path.join(
      process.cwd(),
      'storage',
      'jobs',
      String(userId),
      jobId,
    );

    await fsp.mkdir(storageDir, { recursive: true });

    const fullPath = path.join(storageDir, fileName);
    return { fullPath };
  };

  private waitForPdf = (
    doc: InstanceType<typeof PDFDocument>,
    filePath: string,
  ) => {
    return new Promise<void>((resolve, reject) => {
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      stream.on('finish', () => resolve());
      stream.on('error', reject);
      doc.end();
    });
  };
}
