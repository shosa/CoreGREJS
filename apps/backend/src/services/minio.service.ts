import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { Readable } from 'stream';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client: Minio.Client;
  private defaultBucket: string;

  constructor(private config: ConfigService) {
    this.client = new Minio.Client({
      endPoint: this.config.get('MINIO_ENDPOINT') || 'localhost',
      port: parseInt(this.config.get('MINIO_PORT') || '9000'),
      useSSL: this.config.get('MINIO_USE_SSL') === 'true',
      accessKey: this.config.get('MINIO_ACCESS_KEY') || 'minioadmin',
      secretKey: this.config.get('MINIO_SECRET_KEY') || 'minioadmin123',
    });

    this.defaultBucket = this.config.get('MINIO_BUCKET') || 'coregre-storage';
  }

  async onModuleInit() {
    try {
      // Verifica se il bucket esiste, altrimenti lo crea
      const exists = await this.client.bucketExists(this.defaultBucket);
      if (!exists) {
        await this.client.makeBucket(this.defaultBucket, 'us-east-1');
        this.logger.log(`Bucket ${this.defaultBucket} created`);
      } else {
        this.logger.log(`Bucket ${this.defaultBucket} exists`);
      }
    } catch (error) {
      this.logger.error(`Failed to initialize MinIO: ${error.message}`);
    }
  }

  /**
   * Upload a file to MinIO
   */
  async uploadFile(
    bucket: string,
    objectName: string,
    stream: Readable | Buffer | string,
    size?: number,
    metadata?: Record<string, string>,
  ): Promise<void> {
    try {
      await this.client.putObject(bucket, objectName, stream, size, metadata);
      this.logger.log(`File uploaded: ${bucket}/${objectName}`);
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get file from MinIO
   */
  async getFile(bucket: string, objectName: string): Promise<Readable> {
    try {
      return await this.client.getObject(bucket, objectName);
    } catch (error) {
      this.logger.error(`Failed to get file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get presigned URL for download
   */
  async getPresignedUrl(bucket: string, objectName: string, expiry = 3600): Promise<string> {
    try {
      return await this.client.presignedGetObject(bucket, objectName, expiry);
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete file from MinIO
   */
  async deleteFile(bucket: string, objectName: string): Promise<void> {
    try {
      await this.client.removeObject(bucket, objectName);
      this.logger.log(`File deleted: ${bucket}/${objectName}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`);
      throw error;
    }
  }

  /**
   * List all objects in bucket
   */
  async listAllObjects(bucket: string, prefix = ''): Promise<Array<{ name: string; size: number; lastModified: Date }>> {
    return new Promise((resolve, reject) => {
      const objects: Array<{ name: string; size: number; lastModified: Date }> = [];
      const stream = this.client.listObjects(bucket, prefix, true);

      stream.on('data', (obj) => {
        if (obj.name) {
          objects.push({
            name: obj.name,
            size: obj.size,
            lastModified: obj.lastModified,
          });
        }
      });

      stream.on('error', (err) => {
        this.logger.error(`Failed to list objects: ${err.message}`);
        reject(err);
      });

      stream.on('end', () => {
        resolve(objects);
      });
    });
  }

  /**
   * Get file stats
   */
  async getFileStat(bucket: string, objectName: string): Promise<Minio.BucketItemStat> {
    try {
      return await this.client.statObject(bucket, objectName);
    } catch (error) {
      this.logger.error(`Failed to get file stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Copy file within MinIO
   */
  async copyFile(sourceBucket: string, sourceObject: string, destBucket: string, destObject: string): Promise<void> {
    try {
      const conds = new Minio.CopyConditions();
      await this.client.copyObject(destBucket, destObject, `/${sourceBucket}/${sourceObject}`, conds);
      this.logger.log(`File copied: ${sourceBucket}/${sourceObject} -> ${destBucket}/${destObject}`);
    } catch (error) {
      this.logger.error(`Failed to copy file: ${error.message}`);
      throw error;
    }
  }

  getDefaultBucket(): string {
    return this.defaultBucket;
  }
}
