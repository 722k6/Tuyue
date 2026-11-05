import { CAR_IMAGE_TYPES } from '@tuyue/contracts';
import { mkdirSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const storageRoot = fileURLToPath(new URL('../../storage', import.meta.url));
export const uploadDir = join(storageRoot, 'uploads');
export const staticPrefix = '/static/uploads/';

mkdirSync(uploadDir, { recursive: true });

export function isSupportedImageType(mimeType: string): boolean {
  return (CAR_IMAGE_TYPES as readonly string[]).includes(mimeType);
}

export function buildStoredFilename(originalName: string): string {
  const extension = extname(originalName).toLowerCase() || '.webp';
  return `${randomUUID()}${extension}`;
}

export function toPublicUrl(filename: string): string {
  return `${staticPrefix}${basename(filename)}`;
}

export async function removeStoredFile(url: string): Promise<void> {
  if (!url.startsWith(staticPrefix)) return;
  const filename = basename(url.slice(staticPrefix.length));
  if (!filename) return;
  try {
    await unlink(join(uploadDir, filename));
  } catch {
    // 文件可能已被手动清理，忽略删除失败
  }
}
