import { JobHandler } from '../types';
import * as fs from 'fs';
import * as path from 'path';

const handler: JobHandler = async (payload, helpers) => {
  const { progressivo, fileName, userId, jobId } = payload as {
    progressivo: string;
    fileName: string;
    userId: number;
    jobId: string;
  };
  const { ensureOutputPath } = helpers;

  // Path del file originale
  const srcDir = path.join(process.cwd(), 'storage', 'export', 'src');
  const sourcePath = path.join(srcDir, progressivo, fileName);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`File ${fileName} non trovato`);
  }

  // Copia il file nella directory output del job
  const { fullPath } = await ensureOutputPath(userId, jobId, fileName);
  fs.copyFileSync(sourcePath, fullPath);

  const stat = fs.statSync(fullPath);

  return {
    outputPath: fullPath,
    outputName: fileName,
    outputMime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    outputSize: Number(stat.size)
  };
};

export default handler;
