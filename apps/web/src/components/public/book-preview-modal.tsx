'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toBengali } from '@/lib/format';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  images?: { url: string; alt?: string }[];
  pdf?: { url: string; publicId: string } | null;
  title: string;
}

function ImageViewer({ images }: { images: { url: string; alt?: string }[] }) {
  const [index, setIndex] = useState(0);

  // Reset index when opened (handled by parent via key or effect)
  const current = images[index];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current?.url ?? ''}
          alt={current?.alt ?? ''}
          className="max-h-[70vh] w-full object-contain"
        />
      </div>
      {images.length > 1 && (
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            aria-label="আগের পাতা"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {toBengali(index + 1)}/{toBengali(images.length)}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIndex((i) => Math.min(images.length - 1, i + 1))}
            disabled={index === images.length - 1}
            aria-label="পরের পাতা"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function PdfViewer({ pdf }: { pdf: { url: string; publicId: string } }) {
  return (
    <iframe
      src={pdf.url}
      className="h-[70vh] w-full rounded-md border"
      title="preview-pdf"
    />
  );
}

export function BookPreviewModal({ open, onOpenChange, images, pdf, title }: Props) {
  const hasImages = (images?.length ?? 0) > 0;
  const hasPdf = !!pdf;

  // Reset image index when modal opens — done via a key on ImageViewer
  const [imageKey, setImageKey] = useState(0);
  useEffect(() => {
    if (open) setImageKey((k) => k + 1);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>একটু পড়ে দেখুন — {title}</DialogTitle>
        </DialogHeader>

        {!hasImages && !hasPdf ? (
          <p className="py-8 text-center text-sm text-muted-foreground">প্রিভিউ নেই</p>
        ) : hasImages && hasPdf ? (
          <Tabs defaultValue="images">
            <TabsList className="mb-3">
              <TabsTrigger value="images">পাতা</TabsTrigger>
              <TabsTrigger value="pdf">পিডিএফ</TabsTrigger>
            </TabsList>
            <TabsContent value="images">
              <ImageViewer key={imageKey} images={images!} />
            </TabsContent>
            <TabsContent value="pdf">
              <PdfViewer pdf={pdf!} />
            </TabsContent>
          </Tabs>
        ) : hasImages ? (
          <ImageViewer key={imageKey} images={images!} />
        ) : (
          <PdfViewer pdf={pdf!} />
        )}
      </DialogContent>
    </Dialog>
  );
}
