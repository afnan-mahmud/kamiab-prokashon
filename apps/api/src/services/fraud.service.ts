import type { FraudReport, FraudSignal, FraudCourierBreakdown } from '@kamiab/types';
import { DeliverySettings } from '../models/DeliverySettings.js';
import { decrypt } from '../utils/encryption.js';
import { logger } from '../utils/logger.js';

export class FraudCheckError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FraudCheckError';
  }
}

// ── Signal thresholds ────────────────────────────────────────────────────────
// >= 80% delivered → green, 60–80% → yellow, < 60% → red.
// A phone with zero courier history is treated as green but flagged isNewCustomer.
export function computeSignal(successRatio: number, totalOrders: number): FraudSignal {
  if (totalOrders === 0) return 'green';
  if (successRatio >= 80) return 'green';
  if (successRatio >= 60) return 'yellow';
  return 'red';
}

// Normalized courier counts each adapter produces before we assemble the report.
interface NormalizedCourier {
  name: string;
  total: number;
  delivered: number;
  cancelled: number;
}

function ratioOf(delivered: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((delivered / total) * 100);
}

function buildReport(phone: string, couriers: NormalizedCourier[]): FraudReport {
  const totalOrders = couriers.reduce((s, c) => s + c.total, 0);
  const delivered = couriers.reduce((s, c) => s + c.delivered, 0);
  const cancelled = couriers.reduce((s, c) => s + c.cancelled, 0);
  const successRatio = ratioOf(delivered, totalOrders);

  const breakdown: FraudCourierBreakdown[] = couriers
    .filter((c) => c.total > 0)
    .map((c) => ({
      name: c.name,
      total: c.total,
      delivered: c.delivered,
      cancelled: c.cancelled,
      ratio: ratioOf(c.delivered, c.total),
    }));

  return {
    phone,
    totalOrders,
    delivered,
    cancelled,
    successRatio,
    signal: computeSignal(successRatio, totalOrders),
    isNewCustomer: totalOrders === 0,
    couriers: breakdown,
    checkedAt: new Date().toISOString(),
  };
}

// ── Provider adapters ────────────────────────────────────────────────────────
// Each adapter maps a provider's raw JSON into NormalizedCourier[]. The exact
// key names below are based on the common aggregator response shape and MUST be
// verified against the live response once a real API token is configured.

type Adapter = (phone: string, raw: Record<string, unknown>) => NormalizedCourier[];

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const COURIER_NAMES = ['steadfast', 'pathao', 'redx', 'paperfly'];

// BDCourier: { courierData: { steadfast: { total_parcel, success_parcel, cancelled_parcel }, ... } }
const bdcourierAdapter: Adapter = (_phone, raw) => {
  const data = (raw['courierData'] ?? raw['data'] ?? raw) as Record<string, unknown>;
  return COURIER_NAMES.map((name) => {
    const c = (data[name] ?? {}) as Record<string, unknown>;
    const total = num(c['total_parcel'] ?? c['total']);
    const delivered = num(c['success_parcel'] ?? c['delivered']);
    const cancelled = num(c['cancelled_parcel'] ?? c['cancel'] ?? Math.max(0, total - delivered));
    return { name, total, delivered, cancelled };
  });
};

// FraudBD: { reports: { steadfast: { total_parcels, delivered, cancelled }, ... } }
const fraudbdAdapter: Adapter = (_phone, raw) => {
  const data = (raw['reports'] ?? raw['data'] ?? raw) as Record<string, unknown>;
  return COURIER_NAMES.map((name) => {
    const c = (data[name] ?? {}) as Record<string, unknown>;
    const total = num(c['total_parcels'] ?? c['total']);
    const delivered = num(c['delivered'] ?? c['success']);
    const cancelled = num(c['cancelled'] ?? Math.max(0, total - delivered));
    return { name, total, delivered, cancelled };
  });
};

const ADAPTERS: Record<string, Adapter> = {
  bdcourier: bdcourierAdapter,
  fraudbd: fraudbdAdapter,
};

// Deterministic mock for local dev / testing — derives plausible numbers from the
// phone's last digit so the three signal states are all reachable without an API.
function mockReport(phone: string): FraudReport {
  const lastDigit = Number(phone.replace(/\D/g, '').slice(-1)) || 0;
  if (lastDigit === 0) return buildReport(phone, COURIER_NAMES.map((n) => ({ name: n, total: 0, delivered: 0, cancelled: 0 })));
  const total = 5 + (lastDigit % 5) * 3;
  const ratio = lastDigit <= 3 ? 0.5 : lastDigit <= 6 ? 0.7 : 0.9; // red / yellow / green
  const delivered = Math.round(total * ratio);
  return buildReport(phone, [
    { name: 'steadfast', total, delivered, cancelled: total - delivered },
  ]);
}

// ── Public entry point ───────────────────────────────────────────────────────
// Config comes from the DeliverySettings document (admin → Delivery page),
// not env, so non-technical staff can manage it from the panel.
export async function checkFraud(phoneRaw: string): Promise<FraudReport> {
  const phone = phoneRaw.trim();
  if (!phone) throw new FraudCheckError('Phone number is required for fraud check.');

  const settings = await DeliverySettings.findOne().lean();
  const fraud = settings?.fraud;
  const provider = fraud?.provider ?? 'mock';

  if (provider === 'mock') {
    logger.info(`Fraud check (mock): ${phone}`);
    return mockReport(phone);
  }

  if (!fraud?.isActive) {
    throw new FraudCheckError('Fraud check is not active. Enable it in Delivery Settings.');
  }

  const adapter = ADAPTERS[provider];
  if (!adapter) {
    throw new FraudCheckError(`Unsupported fraud provider: ${provider}`);
  }
  if (!fraud.apiUrl || !fraud.apiToken) {
    throw new FraudCheckError('Fraud API is not configured. Set the API URL and token in Delivery Settings.');
  }

  let apiToken: string;
  try {
    apiToken = decrypt(fraud.apiToken);
  } catch {
    apiToken = fraud.apiToken; // stored as plaintext (no ENCRYPTION_KEY configured)
  }

  let res: Response;
  try {
    res = await fetch(fraud.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ phone }),
    });
  } catch (err) {
    logger.error(`Fraud API request failed: ${(err as Error).message}`);
    throw new FraudCheckError('Could not reach the fraud check service.');
  }

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    const msg = typeof body['message'] === 'string' ? body['message'] : 'Fraud check failed.';
    throw new FraudCheckError(msg);
  }

  return buildReport(phone, adapter(phone, body));
}
