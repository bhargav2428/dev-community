// Storage provider abstraction
export interface StorageProvider {
  upload(file: Buffer, filename: string): Promise<string>;
  delete(filename: string): Promise<void>;
}

export type StorageProviderType = 'local' | 's3';

import { LocalStorageProvider } from './local';
import { S3StorageProvider } from './s3';

export function getStorageProvider(): StorageProvider {
  if (process.env.ENABLE_AWS_S3 === 'true') {
    return new S3StorageProvider();
  }
  return new LocalStorageProvider();
}
