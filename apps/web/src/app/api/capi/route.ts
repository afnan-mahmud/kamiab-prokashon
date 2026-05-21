import { NextRequest, NextResponse } from 'next/server';
import { sendCapiEvent } from '@/lib/capi';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      eventName: string;
      eventId: string;
      eventSourceUrl: string;
      customData: Record<string, unknown>;
      fbp?: string;
      fbc?: string;
      phone?: string;
    };

    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      undefined;
    const userAgent = req.headers.get('user-agent') ?? undefined;

    await sendCapiEvent({ ...body, clientIp, userAgent });
  } catch (err) {
    console.error('[CAPI route]', err);
  }

  // Always 200 — CAPI errors must not bubble to the browser
  return NextResponse.json({ ok: true });
}
