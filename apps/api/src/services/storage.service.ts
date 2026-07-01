import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Request } from 'express';
import { logger } from '../utils/logger.js';

export interface UploadResult {
  url: string;
  publicId: string;
}

// Files are written under <repo>/apps/api/uploads/<folder>/<filename>
// and served by Express at /uploads/<folder>/<filename>.
export const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'image/svg+xml': '.svg',
  'video/mp4': '.mp4',
};

function extFor(mimetype: string, originalName?: string): string {
  if (MIME_EXT[mimetype]) return MIME_EXT[mimetype];
  if (originalName) {
    const ext = path.extname(originalName).toLowerCase();
    if (ext) return ext;
  }
  return '.bin';
}

function buildAbsoluteUrl(req: Request | undefined, relativePath: string): string {
  // Prefer explicit PUBLIC_API_URL — reliable behind Nginx/proxies where
  // req.protocol is always 'http' unless X-Forwarded-Proto is configured.
  const configuredBase = process.env['PUBLIC_API_URL'];
  if (configuredBase) {
    return `${configuredBase.replace(/\/$/, '')}${relativePath}`;
  }
  if (req) {
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
    const host = req.get('host');
    return `${proto}://${host}${relativePath}`;
  }
  return `http://localhost:${process.env['PORT'] ?? 3091}${relativePath}`;
}

export async function uploadImage(
  buffer: Buffer,
  options: { mimetype: string; originalName?: string; folder?: string; req?: Request },
): Promise<UploadResult> {
  const folder = (options.folder ?? 'products').replace(/^\/+|\/+$/g, '');
  const dir = path.join(UPLOAD_ROOT, folder);
  await fs.mkdir(dir, { recursive: true });

  const ext = extFor(options.mimetype, options.originalName);
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  const absPath = path.join(dir, filename);
  await fs.writeFile(absPath, buffer);

  // publicId is the relative path under uploads/, used for deletion.
  const publicId = `${folder}/${filename}`;
  const url = buildAbsoluteUrl(options.req, `/uploads/${publicId}`);

  return { url, publicId };
}

export async function deleteImage(publicId: string): Promise<void> {
  if (!publicId) return;
  // Guard against path traversal
  const normalized = path.posix.normalize(publicId).replace(/^\/+/, '');
  if (normalized.startsWith('..') || normalized.includes('\0')) {
    logger.warn('Refusing to delete suspicious upload path', { publicId });
    return;
  }
  const absPath = path.join(UPLOAD_ROOT, normalized);
  if (!absPath.startsWith(UPLOAD_ROOT)) {
    logger.warn('Refusing to delete outside upload root', { publicId });
    return;
  }
  try {
    await fs.unlink(absPath);
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code !== 'ENOENT') {
      logger.warn('Failed to delete local upload', { publicId, err: e.message });
    }
  }
}
