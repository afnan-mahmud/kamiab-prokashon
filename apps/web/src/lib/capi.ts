import { createHash } from 'crypto';

function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

interface CapiPayload {
  eventName: string;
  eventId: string;
  eventSourceUrl: string;
  customData: Record<string, unknown>;
  fbp?: string;
  fbc?: string;
  phone?: string;
  clientIp?: string;
  userAgent?: string;
}

export async function sendCapiEvent(payload: CapiPayload): Promise<void> {
  const pixelId = process.env.META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  if (!pixelId || !token) return;

  const userData: Record<string, unknown> = {};
  if (payload.clientIp) userData.client_ip_address = payload.clientIp;
  if (payload.userAgent) userData.client_user_agent = payload.userAgent;
  if (payload.fbp) userData.fbp = payload.fbp;
  if (payload.fbc) userData.fbc = payload.fbc;
  if (payload.phone) userData.ph = [sha256(payload.phone)];

  const event: Record<string, unknown> = {
    event_name: payload.eventName,
    event_id: payload.eventId,
    event_time: Math.floor(Date.now() / 1000),
    event_source_url: payload.eventSourceUrl,
    action_source: 'website',
    user_data: userData,
    custom_data: payload.customData,
  };

  const body: Record<string, unknown> = { data: [event] };
  // Only attach test_event_code outside production, so a stray code in the
  // server env can never route live conversions into the Test Events tab.
  if (process.env.META_TEST_EVENT_CODE && process.env.NODE_ENV !== 'production') {
    body.test_event_code = process.env.META_TEST_EVENT_CODE;
  }

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    console.error('[CAPI] Error:', res.status, text);
  }
}
