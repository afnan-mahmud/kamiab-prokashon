# Landing Page Hero Video Support — Design

**Date:** 2026-06-05
**Status:** Approved (design); pending implementation plan

## Summary

Admin landing-page builder e hero section er media slot (title/subtitle/CTA button er niche/pashe je image dekha jay) ekhon image er bodole ekta **locally-uploaded video** dekhate parbe. Video **1:1 ratio** te render hobe, **auto-play + muted + loop + controls** soho. Charta template (template1–template4) support korbe. Upload max **100 MB**, server upload er por **ffmpeg diye compress** kore (quality dhore rekhe) choto kore disk e store korbe.

## Requirements

- Hero media slot e admin Image ba Video choose korte parbe (toggle).
- Video locally upload hobe (existing `/uploads` disk-based storage flow, Cloudinary noy).
- Upload limit: 100 MB.
- Upload er por server-side compression (H.264, near-lossless, dimension cap) — output always `.mp4`.
- Public landing page e video: `autoPlay muted loop playsInline controls`, `aspect-square` (1:1), `object-cover`.
- Charta template e kaj korbe.

## Data Model Changes

`LandingPageContent` e duita notun **optional** field:

```ts
heroMediaType?: 'image' | 'video';   // default 'image'
heroVideo?: { url: string; publicId: string };
```

Render rule: `heroMediaType === 'video' && heroVideo?.url` → video; noile existing image (`heroImage.url` → product image fallback).

`heroImage` field thakbe agei moto — template1/template3 er **faded background** ei field use kore. Video faded-background hisebe use **hobe na** (performance).

Files to update:
- `packages/types/src/landing-page.ts` — `LandingPageContent` interface.
- `apps/api/src/models/LandingPage.ts` — `ILandingPageContent` + `contentSchema` (add `heroMediaType: { type: String, default: 'image' }`, `heroVideo: { url, publicId }`).
- `apps/api/src/routes/admin/landing-pages.routes.ts` — `contentSchema` (zod): add
  `heroMediaType: z.enum(['image','video']).default('image')`,
  `heroVideo: z.object({ url: z.string(), publicId: z.string() }).optional()`.
- `apps/web/src/features/landing-pages/landing-page-builder.tsx` — local content type (~line 33) + defaults (~line 662).

## Video Upload + Compression

### Endpoint
`POST /api/admin/upload/video` — new route in `apps/api/src/routes/admin/upload.routes.ts`.
- `requirePermission('products.create')` (existing upload er moto).
- multer `memoryStorage`, `limits.fileSize = 100 * 1024 * 1024`, `fileFilter`: only `video/*` mimetypes.
- Flow:
  1. `compressVideo(req.file.buffer, req.file.originalname)` → compressed mp4 Buffer.
  2. `uploadImage(compressedBuffer, { mimetype: 'video/mp4', folder: 'landing-videos', req })` → `{ url, publicId }`.
  3. `sendSuccess(res, result, 201)`.

### Compression service — `apps/api/src/services/video.service.ts`
- New dep: **`ffmpeg-static`** (bundled prebuilt binary; system ffmpeg install lage na; VPS e `pnpm install` Linux binary nibe).
- `compressVideo(buffer, originalName): Promise<Buffer>`:
  1. Write input buffer to a temp file (`os.tmpdir()` + random name + original ext).
  2. Spawn ffmpeg (`ffmpegPath` from `ffmpeg-static`) with:
     - `-i <input>`
     - `-vf "scale='min(1080,iw)':-2"` (max width 1080, height even, aspect preserved — CSS `object-cover` does the 1:1 crop)
     - `-c:v libx264 -crf 24 -preset veryfast`
     - `-c:a aac -b:a 128k` (audio rakha hocche; controls thaka tay user unmute korte pare)
     - `-movflags +faststart`
     - `<output>.mp4`
  3. Read output file → Buffer; cleanup both temp files (success o error duto khetre).
  4. ffmpeg fail korle meaningful error throw (route `next(err)` e jabe).

### Storage service — `apps/api/src/services/storage.service.ts`
- `MIME_EXT` e add: `'video/mp4': '.mp4'`.
- `uploadImage` already generic (buffer + mimetype + folder) — reuse korbo; folder `'landing-videos'` pass hobe. Function rename optional (low churn, ekhon rename korbo na).

## Builder UI

`apps/web/src/features/landing-pages/landing-page-builder.tsx` Hero section e:
- **Media Type toggle** (Image | Video) — `heroMediaType` set kore.
- **Image** selected → existing "Hero Image URL" input (joto ache, unchanged).
- **Video** selected → new `VideoUploader` component:
  - File: `apps/web/src/components/admin/video-uploader.tsx`.
  - `ImageUploader` pattern follow korbe but **single file**, `accept="video/*"`, `apiClient.upload('/admin/upload/video', fd)` POST kore.
  - Upload progress (spinner), success e `<video controls>` preview + remove button.
  - Success → `onChange({ ...content, heroVideo: { url, publicId }, heroMediaType: 'video' })`.
  - Remove → `heroVideo` clear (heroMediaType image e fire jete pare).

## Template Rendering — shared component

New file: `apps/web/src/features/landing-pages/templates/hero-media.tsx`

```tsx
function HeroMedia({ content, fallbackImage, className }: {
  content: LandingPageContent;
  fallbackImage?: string;
  className?: string;
}) {
  const useVideo = content.heroMediaType === 'video' && content.heroVideo?.url;
  if (useVideo) {
    return (
      <video
        src={fixImageUrl(content.heroVideo!.url)}
        autoPlay muted loop playsInline controls
        className={className}  // includes aspect-square object-cover
      />
    );
  }
  const img = content.heroImage?.url || fallbackImage;
  return img ? <img src={fixImageUrl(img)} alt="" className={className} /> : null;
}
```

Per-template integration (each keeps its existing wrapper styling; media element forced `aspect-square object-cover` for 1:1):
- **template1** (`templates/template1.tsx` ~line 269): "Right: hero/product image" slot → `<HeroMedia>` (keep `w-60..w-80 rounded-3xl aspect-square`).
- **template2** (~line 190): main hero image (`aspect-square` already) → `<HeroMedia>`.
- **template3** (~line 85): circular hero (`rounded-full`, 1:1) → `<HeroMedia>`; keep `rounded-full` wrapper, video clipped to circle.
- **template4** (~line 80): gallery layout — `heroMediaType==='video'` hole **lead/large gallery tile** e video bosbe (`aspect-square`); noile existing gallery unchanged.

`fixImageUrl` helper same URL base use kore — video `/uploads/...` URL eo kaj korbe.

## Deployment Notes

- `apps/api` e `ffmpeg-static` dependency add → server e `pnpm install` korte hobe (PM2 restart sequence er part).
- Existing CloudPanel/Nginx `/uploads` proxy block video file o serve korbe (same path). Large file serving Nginx handle korbe.

## Known Limitations (matches existing image behavior)

- Media remove korle DB field clear hoy, but purono file disk e **orphan** thake (current image flow eki rokom) — ei scope e address korchi na.
- "Quality same" = visually near-lossless (CRF 24). True lossless noy; file size kome.

## Out of Scope

- Cloudinary video pipeline.
- Multiple hero videos / playlist.
- Orphan file garbage collection.
- Per-template video aspect ratio customization (sob 1:1).
