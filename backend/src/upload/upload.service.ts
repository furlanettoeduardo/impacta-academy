import {
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { Client } from 'minio';
import { processSignatureImage } from './signature.processor';

@Injectable()
export class UploadService implements OnModuleInit {
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

      await this.client.setBucketPolicy(
        this.bucket,
        JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucket}/*`],
            },
          ],
        }),
      );
    } catch (error) {
      throw new InternalServerErrorException('Unable to initialize storage');
    }
  }

  async onModuleInit() {
    await this.ensureBucket();
  }

  async uploadVideo(file: { buffer: Buffer; size: number; mimetype: string }) {
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

  async uploadSignature(file: { buffer: Buffer }) {
    await this.ensureBucket();

    const processed = await processSignatureImage(file.buffer);

    const unique = Math.random().toString(36).slice(2, 8);
    const fileName = `signatures/signature-${Date.now()}-${unique}.webp`;

    try {
      await this.client.putObject(
        this.bucket,
        fileName,
        processed,
        processed.length,
        {
          'Content-Type': 'image/webp',
        },
      );
    } catch (error) {
      throw new InternalServerErrorException(
        'Não foi possível salvar a assinatura.',
      );
    }

    return `${this.publicUrl}/${this.bucket}/${fileName}`;
  }

  /**
   * Lê do MinIO o objeto referenciado por uma URL pública gerada por este
   * serviço. Retorna null se a URL não pertencer ao bucket ou se a leitura
   * falhar (quem chama decide o fallback).
   */
  async getObjectBufferFromUrl(url: string): Promise<Buffer | null> {
    const marker = `/${this.bucket}/`;
    const index = url.indexOf(marker);
    if (index === -1) {
      return null;
    }

    const objectName = url.slice(index + marker.length);

    try {
      const stream = await this.client.getObject(this.bucket, objectName);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk as Buffer);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      return null;
    }
  }
}
