import { TrackingService } from '../tracking/tracking.service';
import { ProduzioneService } from '../produzione/produzione.service';

export interface JobHandlerHelpers {
  trackingService: TrackingService;
  produzioneService: ProduzioneService;
  ensureOutputPath: (userId: number | string, jobId: string, fileName: string) => Promise<{ fullPath: string }>;
  waitForPdf: (doc: PDFKit.PDFDocument, filePath: string) => Promise<void>;
}

export type JobHandler = (payload: any, helpers: JobHandlerHelpers) => Promise<{
  outputPath?: string;
  outputName?: string;
  outputMime?: string;
} | void>;
