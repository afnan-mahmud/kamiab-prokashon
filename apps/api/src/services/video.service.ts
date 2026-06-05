import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import { logger } from '../utils/logger.js';

// ffmpeg-static's default export is the absolute binary path (or null when the
// platform binary is missing). NodeNext mistypes the CJS default as a namespace,
// so normalise it here.
const FFMPEG_BIN = ffmpegPath as unknown as string | null;

// Compress an uploaded video to a web-friendly H.264 MP4.
// Near-lossless quality (CRF 24), capped at 1080px wide, faststart for streaming.
// Returns the compressed file as a Buffer (always .mp4).
export async function compressVideo(buffer: Buffer, originalName?: string): Promise<Buffer> {
  if (!FFMPEG_BIN) {
    throw new Error('ffmpeg binary not available');
  }

  const inExt = (originalName ? path.extname(originalName) : '').toLowerCase() || '.tmp';
  const id = crypto.randomBytes(8).toString('hex');
  const tmpDir = os.tmpdir();
  const inputPath = path.join(tmpDir, `hero-in-${id}${inExt}`);
  const outputPath = path.join(tmpDir, `hero-out-${id}.mp4`);

  await fs.writeFile(inputPath, buffer);

  try {
    await runFfmpeg(FFMPEG_BIN, [
      '-y',
      '-i', inputPath,
      '-vf', "scale='min(1080,iw)':-2",
      '-c:v', 'libx264',
      '-crf', '24',
      '-preset', 'veryfast',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outputPath,
    ]);

    return await fs.readFile(outputPath);
  } finally {
    await Promise.allSettled([fs.unlink(inputPath), fs.unlink(outputPath)]);
  }
}

function runFfmpeg(bin: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args);
    let stderr = '';
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on('error', (err) => reject(err));
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        logger.warn('ffmpeg compression failed', { code, stderr: stderr.slice(-1000) });
        reject(new Error('Video compression failed'));
      }
    });
  });
}
