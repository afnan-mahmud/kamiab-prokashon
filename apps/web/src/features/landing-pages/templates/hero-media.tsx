import type { LandingPageContent } from '@kamiab/types';
import { fixImageUrl } from '@/lib/image-url';

interface HeroMediaProps {
  content: LandingPageContent;
  fallbackImage?: string;
  alt?: string;
  className?: string;
}

// Renders the hero's foreground media slot: an auto-playing 1:1 video when the
// landing page is set to video mode, otherwise the hero/product image.
// `className` should carry the sizing/shape (e.g. aspect-square object-cover).
export function HeroMedia({ content, fallbackImage, alt = '', className }: HeroMediaProps) {
  const useVideo = content.heroMediaType === 'video' && content.heroVideo?.url;

  if (useVideo) {
    return (
      <video
        src={fixImageUrl(content.heroVideo!.url)}
        autoPlay
        muted
        loop
        playsInline
        controls
        className={className}
      />
    );
  }

  const img = content.heroImage?.url || fallbackImage;
  if (!img) return null;

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={fixImageUrl(img)} alt={alt} className={className} />;
}
