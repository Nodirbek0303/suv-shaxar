import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client!: Minio.Client;
  private bucket!: string;
  private enabled = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'design-plans');
    try {
      this.client = new Minio.Client({
        endPoint: this.config.get<string>('MINIO_ENDPOINT', 'localhost'),
        port: Number(this.config.get<string>('MINIO_PORT', '9000')),
        useSSL: this.config.get<string>('MINIO_USE_SSL', 'false') === 'true',
        accessKey: this.config.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
        secretKey: this.config.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
      });

      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket, 'us-east-1');
      }
      this.enabled = true;
      this.logger.log(`MinIO ready: bucket=${this.bucket}`);
    } catch (err: any) {
      this.logger.warn(`MinIO unavailable, uploads disabled: ${err.message}`);
      this.enabled = false;
    }
  }

  async upload(
    file: Express.Multer.File,
  ): Promise<{ url: string; objectName: string }> {
    if (!this.enabled) {
      // Fallback: return a pseudo URL for local MVP without MinIO
      const objectName = `local/${randomUUID()}-${file.originalname}`;
      return {
        url: `/uploads/${objectName}`,
        objectName,
      };
    }

    const objectName = `${randomUUID()}-${file.originalname}`;
    await this.client.putObject(
      this.bucket,
      objectName,
      file.buffer,
      file.size,
      { 'Content-Type': file.mimetype },
    );

    const port = this.config.get<string>('MINIO_PORT', '9000');
    const endpoint = this.config.get<string>('MINIO_ENDPOINT', 'localhost');
    const url = `http://${endpoint}:${port}/${this.bucket}/${objectName}`;
    return { url, objectName };
  }
}
