import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { Readable } from 'stream';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private minioClient: Minio.Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.get<string>('MINIO_BUCKET', 'coregre-storage');
  }

  async onModuleInit() {
    const endPoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = Number(this.configService.get<string>('MINIO_PORT', '9000'));
    const useSSL = this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin');
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY', 'minioadmin123');

    this.minioClient = new Minio.Client({
      endPoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    });

    // Ensure bucket exists
    await this.ensureBucket();
    this.logger.log(`MinIO storage initialized - Bucket: ${this.bucketName}`);
  }

  private async ensureBucket() {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`Bucket ${this.bucketName} created`);
      }
    } catch (error) {
      this.logger.error(`Failed to ensure bucket exists: ${error.message}`);
      throw error;
    }
  }

  /**
   * Upload a file to MinIO
   * @param objectName - Path/name of the object in the bucket (e.g., "jobs/userId/jobId/file.pdf")
   * @param filePath - Local file path to upload
   * @param metadata - Optional metadata
   */
  async uploadFile(objectName: string, filePath: string, metadata?: Record<string, string>): Promise<void> {
    try {
      await this.minioClient.fPutObject(this.bucketName, objectName, filePath, metadata || {});
      this.logger.log(`File uploaded: ${objectName}`);
    } catch (error) {
      this.logger.error(`Failed to upload file ${objectName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Upload a buffer to MinIO
   * @param objectName - Path/name of the object in the bucket
   * @param buffer - Buffer data to upload
   * @param metadata - Optional metadata
   */
  async uploadBuffer(objectName: string, buffer: Buffer, metadata?: Record<string, string>): Promise<void> {
    try {
      const stream = Readable.from(buffer);
      await this.minioClient.putObject(this.bucketName, objectName, stream, buffer.length, metadata || {});
      this.logger.log(`Buffer uploaded: ${objectName}`);
    } catch (error) {
      this.logger.error(`Failed to upload buffer ${objectName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a file as a stream from MinIO
   * @param objectName - Path/name of the object in the bucket
   */
  async getFileStream(objectName: string): Promise<Readable> {
    try {
      return await this.minioClient.getObject(this.bucketName, objectName);
    } catch (error) {
      this.logger.error(`Failed to get file stream ${objectName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a file as a buffer from MinIO
   * @param objectName - Path/name of the object in the bucket
   */
  async getFileBuffer(objectName: string): Promise<Buffer> {
    try {
      const stream = await this.minioClient.getObject(this.bucketName, objectName);
      const chunks: Buffer[] = [];

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
      });
    } catch (error) {
      this.logger.error(`Failed to get file buffer ${objectName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a file from MinIO
   * @param objectName - Path/name of the object in the bucket
   */
  async deleteFile(objectName: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucketName, objectName);
      this.logger.log(`File deleted: ${objectName}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${objectName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if a file exists in MinIO
   * @param objectName - Path/name of the object in the bucket
   */
  async fileExists(objectName: string): Promise<boolean> {
    try {
      await this.minioClient.statObject(this.bucketName, objectName);
      return true;
    } catch (error) {
      if (error.code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file metadata
   * @param objectName - Path/name of the object in the bucket
   */
  async getFileMetadata(objectName: string): Promise<Minio.BucketItemStat> {
    try {
      return await this.minioClient.statObject(this.bucketName, objectName);
    } catch (error) {
      this.logger.error(`Failed to get file metadata ${objectName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * List files with a given prefix
   * @param prefix - Path prefix to search for (e.g., "export/123/")
   */
  async listFiles(prefix: string): Promise<string[]> {
    try {
      const objectsStream = this.minioClient.listObjects(this.bucketName, prefix, true);
      const files: string[] = [];

      return new Promise((resolve, reject) => {
        objectsStream.on('data', (obj) => {
          if (obj.name) {
            files.push(obj.name);
          }
        });
        objectsStream.on('error', reject);
        objectsStream.on('end', () => resolve(files));
      });
    } catch (error) {
      this.logger.error(`Failed to list files with prefix ${prefix}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete all files with a given prefix
   * @param prefix - Path prefix to delete (e.g., "export/123/")
   */
  async deletePrefix(prefix: string): Promise<void> {
    try {
      const files = await this.listFiles(prefix);

      if (files.length === 0) {
        return;
      }

      // MinIO supports batch delete
      await this.minioClient.removeObjects(this.bucketName, files);
      this.logger.log(`Deleted ${files.length} files with prefix: ${prefix}`);
    } catch (error) {
      this.logger.error(`Failed to delete prefix ${prefix}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate object name for jobs
   * @param userId - User ID
   * @param jobId - Job ID
   * @param fileName - File name
   */
  generateJobObjectName(userId: number, jobId: string, fileName: string): string {
    return `jobs/${userId}/${jobId}/${fileName}`;
  }

  /**
   * Generate object name for quality control photos
   * @param cartellinoId - Cartellino ID
   * @param fileName - File name
   */
  generateQualityPhotoObjectName(cartellinoId: string, fileName: string): string {
    return `quality/cq_uploads/${cartellinoId}/${fileName}`;
  }

  /**
   * Generate presigned URL for downloading a file
   * @param objectName - Object name in bucket
   * @param expirySeconds - URL expiry time in seconds (default 3600 = 1 hour)
   */
  async getPresignedUrl(objectName: string, expirySeconds: number = 3600): Promise<string> {
    try {
      return await this.minioClient.presignedGetObject(this.bucketName, objectName, expirySeconds);
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL for ${objectName}: ${error.message}`);
      throw error;
    }
  }
}
