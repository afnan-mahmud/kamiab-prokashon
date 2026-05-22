/**
 * Ensures image URLs use HTTPS in production.
 * Stored URLs may have http:// if the API server was behind a proxy without
 * X-Forwarded-Proto. Next.js <Image> proxies server-side so it's unaffected,
 * but plain <img> tags fail with mixed-content errors on HTTPS pages.
 */
export function fixImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  if (
    url.startsWith('http://') &&
    !url.includes('localhost') &&
    !url.includes('127.0.0.1')
  ) {
    return 'https://' + url.slice(7);
  }
  return url;
}
