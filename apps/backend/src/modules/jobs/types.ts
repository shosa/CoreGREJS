import { TrackingService } from '../tracking/tracking.service';
import { ProduzioneService } from '../produzione/produzione.service';
import { ExportService } from '../export/export.service';

export interface JobHandlerHelpers {
  trackingService: TrackingService;
  produzioneService: ProduzioneService;
  exportService: ExportService;
  ensureOutputPath: (userId: number | string, jobId: string, fileName: string) => Promise<{ fullPath: string }>;
  waitForPdf: (doc: PDFKit.PDFDocument, filePath: string) => Promise<void>;
}

export type JobHandler = (payload: any, helpers: JobHandlerHelpers) => Promise<{
  outputPath?: string;
  outputName?: string;
  outputMime?: string;
  outputSize?: number;
  fullPath?: string;      // Legacy property
  fileName?: string;      // Legacy property
  mime?: string;          // Legacy property
} | void>;
