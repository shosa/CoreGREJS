import trackReportLotPdf from './track.report-lot-pdf';
import trackReportCartelPdf from './track.report-cartel-pdf';
import trackReportLotExcel from './track.report-lot-excel';
import trackReportCartelExcel from './track.report-cartel-excel';
import trackReportFichesPdf from './track.report-fiches-pdf';
import prodReportPdf from './prod.report-pdf';
import { JobHandler } from '../types';

export const jobHandlers: Record<string, JobHandler> = {
  'track.report-lot-pdf': trackReportLotPdf,
  'track.report-cartel-pdf': trackReportCartelPdf,
  'track.report-lot-excel': trackReportLotExcel,
  'track.report-cartel-excel': trackReportCartelExcel,
  'track.report-fiches-pdf': trackReportFichesPdf,
  'prod.report-pdf': prodReportPdf,
};
