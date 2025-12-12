import trackReportLotPdf from './track.report-lot-pdf';
import trackReportCartelPdf from './track.report-cartel-pdf';
import trackReportLotExcel from './track.report-lot-excel';
import trackReportCartelExcel from './track.report-cartel-excel';
import trackReportFichesPdf from './track.report-fiches-pdf';
import trackLinksReportPdf from './track.links-report-pdf';
import prodReportPdf from './prod.report-pdf';
import prodCsvReportPdf from './prod.csv-report-pdf';
import exportSegnacolliPdf from './export.segnacolli-pdf';
import exportGrigliaMaterialiPdf from './export.griglia-materiali-pdf';
import exportDdtCompletoPdf from './export.ddt-completo-pdf';
import exportDdtExcel from './export.ddt-excel';
import exportDownloadExcel from './export.download-excel';
import riparazioniCedolaPdf from './riparazioni.cedola-pdf';
import qualityReportPdf from './quality.report-pdf';
import { JobHandler } from '../types';

export const jobHandlers: Record<string, JobHandler> = {
  'track.report-lot-pdf': trackReportLotPdf,
  'track.report-cartel-pdf': trackReportCartelPdf,
  'track.report-lot-excel': trackReportLotExcel,
  'track.report-cartel-excel': trackReportCartelExcel,
  'track.report-fiches-pdf': trackReportFichesPdf,
  'track.links-report-pdf': trackLinksReportPdf,
  'prod.report-pdf': prodReportPdf,
  'prod.csv-report-pdf': prodCsvReportPdf,
  'export.segnacolli-pdf': exportSegnacolliPdf,
  'export.griglia-materiali-pdf': exportGrigliaMaterialiPdf,
  'export.ddt-completo-pdf': exportDdtCompletoPdf,
  'export.ddt-excel': exportDdtExcel,
  'export.download-excel': exportDownloadExcel,
  'riparazioni.cedola-pdf': riparazioniCedolaPdf,
  'quality.report-pdf': qualityReportPdf,
};
