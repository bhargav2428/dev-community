import { StorageProvider } from './index';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

export class S3StorageProvider implements StorageProvider {
  private s3: S3Client;
  private bucket: string;

  constructor() {
    this.s3 = new S3Client({
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
      region: process.env.AWS_REGION || 'us-east-1',
    });
    this.bucket = process.env.AWS_S3_BUCKET || '';
  }

  async upload(file: Buffer, filename: string): Promise<string> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: filename,
        Body: file,
        ACL: 'public-read',
      }),
    );
    return `https://${this.bucket}.s3.amazonaws.com/${filename}`;
  }

  async delete(filename: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: filename,
      }),
    );
  }
}
