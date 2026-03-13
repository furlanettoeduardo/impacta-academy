import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Client } from 'minio';

@Injectable()
export class UploadService {
  private readonly client: Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor() {
    const endpoint = process.env.MINIO_ENDPOINT ?? 'minio';
    const port = Number(process.env.MINIO_PORT ?? 9000);
    const accessKey = process.env.MINIO_ACCESS_KEY ?? 'minioadmin';
    const secretKey = process.env.MINIO_SECRET_KEY ?? 'minioadmin';

    this.bucket = process.env.MINIO_BUCKET ?? 'videos';
    this.publicUrl = process.env.MINIO_PUBLIC_URL ?? 'http://localhost:9000';

    this.client = new Client({
      endPoint: endpoint,
      port,
      useSSL: false,
      accessKey,
      secretKey,
    });
  }

  async ensureBucket() {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket, 'us-east-1');
      }
    } catch (error) {
      throw new InternalServerErrorException('Unable to initialize storage');
    }
  }

  async uploadVideo(file: Express.Multer.File) {
    await this.ensureBucket();

    const unique = Math.random().toString(36).slice(2, 8);
    const fileName = `lesson-${Date.now()}-${unique}.mp4`;

    try {
      await this.client.putObject(
        this.bucket,
        fileName,
        file.buffer,
        file.size,
        {
          'Content-Type': file.mimetype,
        },
      );
    } catch (error) {
      throw new InternalServerErrorException('Unable to upload video');
    }

    return `${this.publicUrl}/${this.bucket}/${fileName}`;
  }
}
