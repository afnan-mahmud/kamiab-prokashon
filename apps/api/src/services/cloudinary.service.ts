import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let configured = false;

function configure() {
  if (configured) return;
  if (
    env.CLOUDINARY_CLOUD_NAME &&
    env.CLOUDINARY_API_KEY &&
    env.CLOUDINARY_API_SECRET &&
    !env.CLOUDINARY_CLOUD_NAME.startsWith('your-')
  ) {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
    });
    configured = true;
    logger.info('Cloudinary configured');
  } else {
    logger.warn('Cloudinary not configured — uploads will return placeholder URLs');
  }
}

export interface UploadResult {
  url: string;
  publicId: string;
}

export async function uploadImage(
  buffer: Buffer,
  folder = 'sodaikini/products',
): Promise<UploadResult> {
  configure();

  if (!configured) {
    // Dev placeholder — no actual upload
    const fakeId = `dev/${Date.now()}`;
    return {
      url: `https://placehold.co/600x600/4a7c2e/ffffff?text=Product+Image`,
      publicId: fakeId,
    };
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image', quality: 'auto', fetch_format: 'auto' },
      (err, result) => {
        if (err || !result) return reject(err ?? new Error('Upload failed'));
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
}

export async function deleteImage(publicId: string): Promise<void> {
  configure();
  if (!configured) return;
  await cloudinary.uploader.destroy(publicId);
}
