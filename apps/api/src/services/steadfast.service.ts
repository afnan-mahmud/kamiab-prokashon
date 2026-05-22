import { DeliverySettings } from '../models/DeliverySettings.js';
import { decrypt } from '../utils/encryption.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

interface SteadfastOrderPayload {
  invoice: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  cod_amount: number;
  note?: string;
}

interface SteadfastOrderResult {
  consignment_id: string;
  tracking_code: string;
  status: string;
}

interface SteadfastStatusResult {
  delivery_status: string;
}

interface SteadfastBalance {
  current_balance: number;
}

export class SteadfastError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SteadfastError';
  }
}

async function getCredentials(): Promise<{ baseUrl: string; apiKey: string; secretKey: string }> {
  const settings = await DeliverySettings.findOne().lean();
  if (!settings?.steadfast.isActive) {
    throw new SteadfastError('Steadfast is not active. Configure it in Delivery Settings.');
  }

  if (!settings.steadfast.apiKey || !settings.steadfast.secretKey) {
    throw new SteadfastError('Steadfast API key and secret are not configured.');
  }

  const apiKey = decrypt(settings.steadfast.apiKey);
  const secretKey = decrypt(settings.steadfast.secretKey);

  return {
    baseUrl: settings.steadfast.baseUrl || env.STEADFAST_BASE_URL,
    apiKey,
    secretKey,
  };
}

function authHeaders(apiKey: string, secretKey: string): Record<string, string> {
  return {
    'Api-Key': apiKey,
    'Secret-Key': secretKey,
    'Content-Type': 'application/json',
  };
}

export async function createSteadfastOrder(
  payload: SteadfastOrderPayload,
): Promise<SteadfastOrderResult> {
  const { baseUrl, apiKey, secretKey } = await getCredentials();

  const res = await fetch(`${baseUrl}/create_order`, {
    method: 'POST',
    headers: authHeaders(apiKey, secretKey),
    body: JSON.stringify(payload),
  });

  const body = (await res.json()) as Record<string, unknown>;

  if (!res.ok) {
    // Steadfast error format: { message: '...' } or { error: { field: ['msg'] } }
    let msg = 'Steadfast error';
    if (typeof body['message'] === 'string') {
      msg = body['message'];
    } else if (body['error'] && typeof body['error'] === 'object') {
      const errs = body['error'] as Record<string, string[]>;
      const first = Object.values(errs)[0];
      if (Array.isArray(first) && first.length > 0) msg = String(first[0]);
    }
    throw new SteadfastError(msg);
  }

  // Steadfast wraps the created consignment under a 'consignment' key
  const consignment = (body['consignment'] as Record<string, unknown> | undefined) ?? body;

  return {
    consignment_id: String(consignment['consignment_id'] ?? ''),
    tracking_code: String(consignment['tracking_code'] ?? ''),
    status: String(consignment['status'] ?? ''),
  };
}

export async function getSteadfastStatus(consignmentId: string): Promise<SteadfastStatusResult> {
  const { baseUrl, apiKey, secretKey } = await getCredentials();

  const res = await fetch(`${baseUrl}/status_by_cid/${consignmentId}`, {
    headers: authHeaders(apiKey, secretKey),
  });

  const body = (await res.json()) as Record<string, unknown>;

  if (!res.ok) {
    const msg = typeof body['message'] === 'string' ? body['message'] : 'Steadfast status error';
    throw new SteadfastError(msg);
  }

  const delivery = (body['delivery_status'] as Record<string, unknown> | undefined) ?? body;
  return { delivery_status: String(delivery['delivery_status'] ?? body['delivery_status'] ?? '') };
}

export async function getSteadfastBalance(): Promise<SteadfastBalance> {
  const { baseUrl, apiKey, secretKey } = await getCredentials();

  const res = await fetch(`${baseUrl}/get_balance`, {
    headers: authHeaders(apiKey, secretKey),
  });

  const body = (await res.json()) as Record<string, unknown>;

  if (!res.ok) {
    throw new SteadfastError('Failed to fetch Steadfast balance');
  }

  return { current_balance: Number(body['current_balance'] ?? 0) };
}
