import { StorageProvider } from './index';
import path from 'path';
import fs from 'fs/promises';

export class LocalStorageProvider implements StorageProvider {
  async upload(file: Buffer, filename: string): Promise<string> {
    const uploadPath = path.join(process.env.UPLOADS_DIR || 'uploads', filename);
    await fs.writeFile(uploadPath, file);
    return uploadPath;
  }

  async delete(filename: string): Promise<void> {
    const uploadPath = path.join(process.env.UPLOADS_DIR || 'uploads', filename);
    await fs.unlink(uploadPath);
  }
}
