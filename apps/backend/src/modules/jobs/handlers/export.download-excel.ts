import { JobHandler } from '../types';
import * as fs from 'fs';
import * as fsp from 'fs/promises';

const handler: JobHandler = async (payload, helpers) => {
  const { progressivo, fileName, userId, jobId } = payload as {
    progressivo: string;
    fileName: string;
    userId: number;
    jobId: string;
  };
  const { ensureOutputPath, storageService } = helpers;

  // Path del file in MinIO
  const objectName = `export/${progressivo}/${fileName}`;

  // Scarica il file da MinIO
  let buffer: Buffer;
  try {
    buffer = await storageService.getFileBuffer(objectName);
  } catch (error: any) {
    if (error.code === 'FILE_NOT_FOUND' || error.message?.includes('does not exist')) {
      throw new Error(`File ${fileName} non trovato`);
    }
    throw error;
  }

  // Copia il file nella directory output del job
  const { fullPath } = await ensureOutputPath(userId, jobId, fileName);
  await fsp.writeFile(fullPath, buffer);

  const stat = fs.statSync(fullPath);

  return {
    outputPath: fullPath,
    outputName: fileName,
    outputMime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    outputSize: Number(stat.size)
  };
};

export default handler;
