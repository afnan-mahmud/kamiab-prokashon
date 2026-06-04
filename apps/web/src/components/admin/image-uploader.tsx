'use client';

import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { apiClient, ApiError } from '@/lib/api-client';
import type { ProductImage } from '@shukhilife/types';

interface ImageUploaderProps {
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  maxImages?: number;
}

interface UploadResult {
  url: string;
  publicId: string;
}

export function ImageUploader({ images, onChange, maxImages = 8 }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const remaining = maxImages - images.length;
      if (remaining <= 0) {
        toast.error(`Maximum ${maxImages} images allowed`);
        return;
      }

      const toUpload = files.slice(0, remaining);
      setUploading(true);

      const results = await Promise.allSettled(
        toUpload.map(async (file) => {
          const fd = new FormData();
          fd.append('file', file);
          return apiClient.upload<UploadResult>('/admin/upload', fd);
        }),
      );

      const newImages: ProductImage[] = [];
      for (const result of results) {
        if (result.status === 'fulfilled') {
          newImages.push({ url: result.value.url, publicId: result.value.publicId, alt: '' });
        } else {
          const msg =
            result.reason instanceof ApiError ? result.reason.message : 'Upload failed';
          toast.error(msg);
        }
      }

      if (newImages.length > 0) {
        onChange([...images, ...newImages]);
        toast.success(`${newImages.length} image(s) uploaded`);
      }

      setUploading(false);
    },
    [images, maxImages, onChange],
  );

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      toast.error('Please select image files only');
      return;
    }
    void uploadFiles(imageFiles);
  };

  const removeImage = (publicId: string) => {
    onChange(images.filter((img) => img.publicId !== publicId));
  };

  const updateAlt = (publicId: string, alt: string) => {
    onChange(images.map((img) => (img.publicId === publicId ? { ...img, alt } : img)));
  };

  return (
    <div className="space-y-3">
      {/* Dropzone */}
      <div
        className={cn(
          'relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-8 transition-colors',
          dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
          images.length >= maxImages && 'pointer-events-none opacity-50',
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : (
          <Upload className="h-8 w-8 text-muted-foreground" />
        )}
        <div className="text-center">
          <p className="text-sm font-medium">
            {uploading ? 'Uploading...' : 'Drop images here or click to browse'}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            PNG, JPG, WEBP — max 10 MB each — {images.length}/{maxImages} used
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Preview grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((img, idx) => (
            <div key={img.publicId} className="group relative">
              <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                {img.url ? (
                  <Image
                    src={img.url}
                    alt={img.alt || `Product image ${idx + 1}`}
                    fill
                    className="object-cover"
                    sizes="150px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                {idx === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-primary px-1 py-0.5 text-[10px] font-semibold text-white">
                    Main
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(img.publicId)}
                  className="absolute right-1 top-1 hidden rounded-full bg-destructive p-0.5 text-white group-hover:flex"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <input
                type="text"
                placeholder="Alt text"
                value={img.alt}
                onChange={(e) => updateAlt(img.publicId, e.target.value)}
                className="mt-1 w-full rounded border border-border px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
