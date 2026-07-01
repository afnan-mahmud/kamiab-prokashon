'use client';

import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import { Loader2, Upload, X, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ApiError, apiClient } from '@/lib/api-client';

interface SingleImage {
  url: string;
  publicId: string;
}

interface SingleImageUploadProps {
  value: SingleImage | null | undefined;
  onChange: (img: SingleImage | null) => void;
  label?: string;
}

export function SingleImageUpload({ value, onChange, label = 'image' }: SingleImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const result = await apiClient.upload<{ url: string; publicId: string }>('/admin/upload', fd);
        onChange({ url: result.url, publicId: result.publicId });
        toast.success('Image uploaded');
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [onChange],
  );

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative inline-block">
          <div className="relative h-24 w-24 overflow-hidden rounded-lg border border-border bg-muted">
            <Image src={value.url} alt={label} fill className="object-cover" sizes="96px" />
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-0.5 text-white"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div
          className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border py-6 hover:border-primary/50"
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          )}
          <p className="text-xs text-muted-foreground">
            {uploading ? 'Uploading...' : `Click to upload ${label} (optional)`}
          </p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />
      {!value && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          {uploading ? 'Uploading...' : 'Upload image'}
        </Button>
      )}
    </div>
  );
}
