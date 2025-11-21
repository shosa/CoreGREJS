import { JobHandler } from '../types';
import * as fs from 'fs';

const handler: JobHandler = async (payload, helpers) => {
  const { date, userId, jobId } = payload as { date: string; userId: number; jobId: string };
  const { produzioneService, ensureOutputPath } = helpers;

  const fileName = `PRODUZIONE_${date}.pdf`;
  const { fullPath } = await ensureOutputPath(userId, jobId, fileName);

  const buffer = await produzioneService.generatePdf(date);
  fs.writeFileSync(fullPath, buffer);
  const stat = fs.statSync(fullPath);
  return { outputPath: fullPath, outputName: fileName, outputMime: 'application/pdf', outputSize: Number(stat.size) };
};

export default handler;
