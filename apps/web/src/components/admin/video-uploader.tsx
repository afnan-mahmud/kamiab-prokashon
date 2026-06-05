'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { apiClient, ApiError } from '@/lib/api-client';
import { fixImageUrl } from '@/lib/image-url';

interface VideoValue {
  url: string;
  publicId: string;
}

interface VideoUploaderProps {
  value: VideoValue;
  onChange: (value: VideoValue) => void;
}

interface UploadResult {
  url: string;
  publicId: string;
}

const MAX_BYTES = 100 * 1024 * 1024; // 100 MB

export function VideoUploader({ value, onChange }: VideoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('video/')) {
        toast.error('Please select a video file');
        return;
      }
      if (file.size > MAX_BYTES) {
        toast.error('Video must be 100 MB or smaller');
        return;
      }

      setUploading(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const result = await apiClient.upload<UploadResult>('/admin/upload/video', fd);
        onChange({ url: result.url, publicId: result.publicId });
        toast.success('Video uploaded');
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Upload failed';
        toast.error(msg);
      } finally {
        setUploading(false);
      }
    },
    [onChange],
  );

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    void uploadFile(file);
  };

  return (
    <div className="space-y-3">
      {value.url ? (
        <div className="relative">
          <video
            src={fixImageUrl(value.url)}
            controls
            playsInline
            className="aspect-square w-full max-w-xs rounded-lg border border-border object-cover"
          />
          <button
            type="button"
            onClick={() => onChange({ url: '', publicId: '' })}
            className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-white"
            aria-label="Remove video"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          className={cn(
            'relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-8 transition-colors',
            dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
            uploading && 'pointer-events-none opacity-70',
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
              {uploading ? 'Uploading & compressing…' : 'Drop a video here or click to browse'}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              MP4, MOV, WEBM — max 100 MB. Server compresses & shows it in 1:1.
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}
    </div>
  );
}
