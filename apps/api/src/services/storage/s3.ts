import { StorageProvider } from './index';
import { S3 } from 'aws-sdk';

export class S3StorageProvider implements StorageProvider {
  private s3: S3;
  private bucket: string;

  constructor() {
    this.s3 = new S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
    });
    this.bucket = process.env.AWS_S3_BUCKET || '';
  }

  async upload(file: Buffer, filename: string): Promise<string> {
    const params = {
      Bucket: this.bucket,
      Key: filename,
      Body: file,
      ACL: 'public-read',
    };
    await this.s3.upload(params).promise();
    return `https://${this.bucket}.s3.amazonaws.com/${filename}`;
  }

  async delete(filename: string): Promise<void> {
    const params = {
      Bucket: this.bucket,
      Key: filename,
    };
    await this.s3.deleteObject(params).promise();
  }
}
