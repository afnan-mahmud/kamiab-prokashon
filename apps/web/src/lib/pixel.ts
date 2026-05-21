declare global {
  interface Window {
    fbq: ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void };
  }
}

export function getCookies(): { fbp: string | undefined; fbc: string | undefined } {
  if (typeof document === 'undefined') return { fbp: undefined, fbc: undefined };
  const map = Object.fromEntries(
    document.cookie.split('; ').flatMap((c) => {
      const idx = c.indexOf('=');
      if (idx < 0) return [];
      return [[c.slice(0, idx), c.slice(idx + 1)]];
    }),
  );
  return { fbp: map['_fbp'], fbc: map['_fbc'] };
}

export function genEventId(): string {
  return crypto.randomUUID();
}

export function trackPixelEvent(
  eventName: string,
  data: Record<string, unknown>,
  eventId: string,
): void {
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq('track', eventName, data, { eventID: eventId });
}

export async function sendCapiEvent(payload: {
  eventName: string;
  eventId: string;
  customData: Record<string, unknown>;
  fbp?: string;
  fbc?: string;
  phone?: string;
}): Promise<void> {
  try {
    await fetch('/api/capi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        eventSourceUrl: window.location.href,
      }),
    });
  } catch {
    // CAPI errors must never surface to the user
  }
}

/** Fire both browser pixel and server-side CAPI with the same event_id. */
export function fireEvent(
  eventName: string,
  customData: Record<string, unknown>,
  extra?: { phone?: string },
): void {
  const eventId = genEventId();
  const { fbp, fbc } = getCookies();
  trackPixelEvent(eventName, customData, eventId);
  void sendCapiEvent({ eventName, eventId, customData, fbp, fbc, phone: extra?.phone });
}
