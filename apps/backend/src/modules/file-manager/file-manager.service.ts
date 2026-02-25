import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from '../../services/minio.service';
import * as dayjs from 'dayjs';

export interface FileFilter {
  userId?: number;
  jobId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  mimeType?: string;
  search?: string;
}

export interface FileStats {
  totalFiles: number;
  totalSize: number;
  filesByUser: Array<{ userId: number; userName: string; count: number; size: number }>;
  filesByType: Array<{ mimeType: string; count: number; size: number }>;
  filesByDate: Array<{ date: string; count: number; size: number }>;
}

@Injectable()
export class FileManagerService {
  private readonly logger = new Logger(FileManagerService.name);

  private readonly bucket: string;

  constructor(
    private prisma: PrismaService,
    private minio: MinioService,
  ) {
    this.bucket = this.minio.getDefaultBucket();
  }

  /**
   * Lista file con filtri — solo cartella jobs/
   */
  async listFiles(filter: FileFilter = {}, page = 1, limit = 50) {
    const where: any = {
      bucket: this.bucket,
      objectKey: { startsWith: 'jobs/' }, // solo cartella jobs
    };

    if (filter.userId) where.userId = filter.userId;
    if (filter.jobId) where.jobId = filter.jobId;
    if (filter.mimeType) {
      // "excel" matches both xlsx (spreadsheetml) and xls (ms-excel)
      if (filter.mimeType === 'excel') {
        where.OR = [
          { mimeType: { contains: 'spreadsheet' } },
          { mimeType: { contains: 'ms-excel' } },
        ];
      } else {
        where.mimeType = { contains: filter.mimeType };
      }
    }
    if (filter.dateFrom || filter.dateTo) {
      where.uploadedAt = {};
      if (filter.dateFrom) where.uploadedAt.gte = filter.dateFrom;
      if (filter.dateTo) where.uploadedAt.lte = filter.dateTo;
    }
    if (filter.search) {
      where.OR = [
        { fileName: { contains: filter.search } },
        { objectKey: { contains: filter.search } },
      ];
    }

    const [files, total] = await Promise.all([
      this.prisma.minioFile.findMany({
        where,
        include: {
          user: { select: { id: true, userName: true, nome: true } },
          job: { select: { id: true, type: true, status: true } },
        },
        orderBy: { uploadedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.minioFile.count({ where }),
    ]);

    return {
      files: files.map((f) => ({
        ...f,
        fileSize: Number(f.fileSize),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Statistiche sui file — solo cartella jobs/
   */
  async getStats(): Promise<FileStats> {
    const files = await this.prisma.minioFile.findMany({
      where: { bucket: this.bucket, objectKey: { startsWith: 'jobs/' } },
      include: { user: true },
    });

    const totalSize = files.reduce((sum, f) => sum + Number(f.fileSize), 0);

    // Raggruppa per utente
    const byUser = files.reduce((acc, f) => {
      if (!f.userId) return acc;
      const key = f.userId;
      if (!acc[key]) {
        acc[key] = {
          userId: f.userId,
          userName: f.user?.userName || 'Unknown',
          count: 0,
          size: 0,
        };
      }
      acc[key].count++;
      acc[key].size += Number(f.fileSize);
      return acc;
    }, {} as Record<number, any>);

    // Raggruppa per tipo
    const byType = files.reduce((acc, f) => {
      const type = f.mimeType || 'unknown';
      if (!acc[type]) acc[type] = { mimeType: type, count: 0, size: 0 };
      acc[type].count++;
      acc[type].size += Number(f.fileSize);
      return acc;
    }, {} as Record<string, any>);

    // Raggruppa per data
    const byDate = files.reduce((acc, f) => {
      const date = dayjs(f.uploadedAt).format('YYYY-MM-DD');
      if (!acc[date]) acc[date] = { date, count: 0, size: 0 };
      acc[date].count++;
      acc[date].size += Number(f.fileSize);
      return acc;
    }, {} as Record<string, any>);

    return {
      totalFiles: files.length,
      totalSize,
      filesByUser: Object.values(byUser),
      filesByType: Object.values(byType).sort((a: any, b: any) => b.size - a.size),
      filesByDate: Object.values(byDate).sort((a: any, b: any) => a.date.localeCompare(b.date)),
    };
  }

  /**
   * Ottieni stream per il download diretto (proxy — nessun redirect a MinIO)
   */
  async getFileStream(fileId: number): Promise<{ stream: any; fileName: string; mimeType: string }> {
    const file = await this.prisma.minioFile.findUnique({ where: { id: fileId } });
    if (!file) throw new Error('File not found');

    await this.prisma.minioFile.update({
      where: { id: fileId },
      data: { lastAccess: new Date() },
    });

    const stream = await this.minio.getFile(file.bucket, file.objectKey);
    const fileName = file.fileName || file.objectKey.split('/').pop() || 'download';
    return { stream, fileName, mimeType: file.mimeType || 'application/octet-stream' };
  }

  /**
   * @deprecated Usa getFileStream per evitare redirect all'host interno MinIO
   */
  async getDownloadUrl(fileId: number): Promise<string> {
    const file = await this.prisma.minioFile.findUnique({ where: { id: fileId } });
    if (!file) throw new Error('File not found');
    await this.prisma.minioFile.update({ where: { id: fileId }, data: { lastAccess: new Date() } });
    return await this.minio.getPresignedUrl(file.bucket, file.objectKey);
  }

  /**
   * Elimina file con filtri — solo cartella jobs/
   */
  async deleteFiles(filter: FileFilter): Promise<{ deleted: number; size: number }> {
    const where: any = { bucket: this.bucket, objectKey: { startsWith: 'jobs/' } };

    if (filter.userId) where.userId = filter.userId;
    if (filter.jobId) where.jobId = filter.jobId;
    if (filter.mimeType) {
      if (filter.mimeType === 'excel') {
        where.OR = [
          { mimeType: { contains: 'spreadsheet' } },
          { mimeType: { contains: 'ms-excel' } },
        ];
      } else {
        where.mimeType = { contains: filter.mimeType };
      }
    }
    if (filter.dateFrom || filter.dateTo) {
      where.uploadedAt = {};
      if (filter.dateFrom) where.uploadedAt.gte = filter.dateFrom;
      if (filter.dateTo) where.uploadedAt.lte = filter.dateTo;
    }

    const filesToDelete = await this.prisma.minioFile.findMany({ where });

    let deletedCount = 0;
    let deletedSize = 0;

    for (const file of filesToDelete) {
      try {
        // Elimina da MinIO
        await this.minio.deleteFile(file.bucket, file.objectKey);

        // Se il file è collegato a un job, elimina anche il job
        if (file.jobId) {
          try {
            await this.prisma.job.delete({ where: { id: file.jobId } });
            this.logger.log(`Deleted job ${file.jobId} associated with file ${file.id}`);
          } catch (error) {
            this.logger.warn(`Failed to delete job ${file.jobId}: ${error.message}`);
          }
        }

        // Elimina dal DB
        await this.prisma.minioFile.delete({ where: { id: file.id } });

        deletedCount++;
        deletedSize += Number(file.fileSize);
      } catch (error) {
        this.logger.error(`Failed to delete file ${file.id}: ${error.message}`);
      }
    }

    return { deleted: deletedCount, size: deletedSize };
  }

  /**
   * Elimina singolo file
   */
  async deleteFile(fileId: number): Promise<void> {
    const file = await this.prisma.minioFile.findUnique({
      where: { id: fileId },
    });

    if (!file) throw new Error('File not found');

    // Elimina da MinIO
    await this.minio.deleteFile(file.bucket, file.objectKey);

    // Se il file è collegato a un job, elimina anche il job
    if (file.jobId) {
      try {
        await this.prisma.job.delete({ where: { id: file.jobId } });
        this.logger.log(`Deleted job ${file.jobId} associated with file ${fileId}`);
      } catch (error) {
        this.logger.warn(`Failed to delete job ${file.jobId}: ${error.message}`);
      }
    }

    // Elimina dal DB
    await this.prisma.minioFile.delete({ where: { id: fileId } });
  }

  /**
   * Sincronizza file dal bucket MinIO al DB
   * (utile per recuperare file caricati manualmente o da altri sistemi)
   */
  async syncFromMinio(): Promise<{ synced: number; errors: number }> {
    this.logger.log('Starting MinIO sync...');

    const objects = await this.minio.listAllObjects(this.bucket);
    let synced = 0;
    let errors = 0;

    for (const obj of objects) {
      // Gestisce solo file nella cartella jobs/
      if (!obj.name.startsWith('jobs/')) continue;

      try {
        const existing = await this.prisma.minioFile.findFirst({
          where: { bucket: this.bucket, objectKey: obj.name },
        });

        // Estrai userId e jobId dal path
        // Formato atteso: jobs/[userId]/[jobId]/filename.pdf
        let userId: number | null = null;
        let jobId: string | null = null;
        const pathParts = obj.name.split('/');
        let metadata: any = {};

        if (pathParts.length >= 4) {
          userId = parseInt(pathParts[1]);
          jobId = pathParts[2];
          metadata = { type: 'job', jobId: pathParts[2] };
          this.logger.log(`  -> Job file: userId=${userId}, jobId=${jobId}`);
        } else {
          metadata = { type: 'job' };
          this.logger.log(`  -> Job file (path incompleto): ${obj.name}`);
        }

        if (!existing) {
          await this.prisma.minioFile.create({
            data: {
              bucket: this.bucket,
              objectKey: obj.name,
              fileName: obj.name.split('/').pop() || obj.name,
              fileSize: obj.size,
              mimeType: this.getMimeType(obj.name),
              uploadedAt: obj.lastModified,
              userId: userId && !isNaN(userId) ? userId : null,
              jobId: jobId || null,
              metadata: metadata,
            },
          });
          synced++;
        } else if (existing.userId === null && userId) {
          // Aggiorna i file esistenti che non hanno userId o metadata
          await this.prisma.minioFile.update({
            where: { id: existing.id },
            data: {
              userId: userId && !isNaN(userId) ? userId : null,
              jobId: jobId || null,
              metadata: metadata,
            },
          });
          synced++;
        } else if (!existing.metadata || Object.keys(existing.metadata as object || {}).length === 0) {
          // Aggiorna solo metadata se manca
          await this.prisma.minioFile.update({
            where: { id: existing.id },
            data: { metadata: metadata },
          });
          synced++;
        }
      } catch (error) {
        this.logger.error(`Failed to sync ${obj.name}: ${error.message}`);
        errors++;
      }
    }

    this.logger.log(`Sync completed: ${synced} synced, ${errors} errors`);
    return { synced, errors };
  }

  private getMimeType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      xls: 'application/vnd.ms-excel',
      csv: 'text/csv',
      txt: 'text/plain',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      zip: 'application/zip',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }
}
