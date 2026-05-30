import { Router } from 'express';
import { z } from 'zod';
import { DeliverySettings } from '../../models/DeliverySettings.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { sendSuccess, sendError } from '../../utils/api-response.js';
import { encrypt, decrypt } from '../../utils/encryption.js';
import { getSteadfastBalance } from '../../services/steadfast.service.js';

const router: Router = Router();

function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  return key.slice(0, 4) + '••••••••' + key.slice(-4);
}

function safeDecrypt(val: string): string {
  if (!val) return '';
  try {
    return decrypt(val);
  } catch {
    return val; // already plaintext (dev mode)
  }
}

// GET /api/admin/delivery-settings
router.get('/', requirePermission('delivery.view'), async (_req, res, next) => {
  try {
    const existing = await DeliverySettings.findOne().lean();
    const settings = existing ?? (await DeliverySettings.create({})).toObject();

    // Return masked keys — never send plaintext secrets to frontend
    sendSuccess(res, {
      steadfast: {
        apiKeyMasked: maskKey(safeDecrypt(settings.steadfast.apiKey)),
        secretKeyMasked: maskKey(safeDecrypt(settings.steadfast.secretKey)),
        baseUrl: settings.steadfast.baseUrl,
        isActive: settings.steadfast.isActive,
        hasApiKey: !!settings.steadfast.apiKey,
        hasSecretKey: !!settings.steadfast.secretKey,
      },
      charges: settings.charges,
      fraud: {
        provider: settings.fraud?.provider ?? 'mock',
        apiUrl: settings.fraud?.apiUrl ?? '',
        isActive: settings.fraud?.isActive ?? false,
        hasApiToken: !!settings.fraud?.apiToken,
        apiTokenMasked: settings.fraud?.apiToken ? maskKey(safeDecrypt(settings.fraud.apiToken)) : '',
      },
    });
  } catch (err) {
    next(err);
  }
});

const updateSchema = z.object({
  steadfast: z
    .object({
      apiKey: z.string().optional(),
      secretKey: z.string().optional(),
      baseUrl: z.string().url().optional(),
      isActive: z.boolean().optional(),
    })
    .optional(),
  charges: z
    .object({
      insideDhaka: z.number().min(0).optional(),
      outsideDhaka: z.number().min(0).optional(),
      extraPerKg: z.number().min(0).optional(),
      baseWeightKg: z.number().min(0).optional(),
    })
    .optional(),
  fraud: z
    .object({
      provider: z.enum(['mock', 'bdcourier', 'fraudbd']).optional(),
      apiUrl: z.string().url().or(z.literal('')).optional(),
      apiToken: z.string().optional(),
      isActive: z.boolean().optional(),
    })
    .optional(),
});

// PATCH /api/admin/delivery-settings
router.patch('/', requirePermission('delivery.edit'), async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);

    let settings = await DeliverySettings.findOne();
    if (!settings) settings = new DeliverySettings({});

    if (data.steadfast) {
      if (data.steadfast.apiKey !== undefined && data.steadfast.apiKey !== '') {
        try {
          settings.steadfast.apiKey = encrypt(data.steadfast.apiKey);
        } catch {
          settings.steadfast.apiKey = data.steadfast.apiKey;
        }
      }
      if (data.steadfast.secretKey !== undefined && data.steadfast.secretKey !== '') {
        try {
          settings.steadfast.secretKey = encrypt(data.steadfast.secretKey);
        } catch {
          settings.steadfast.secretKey = data.steadfast.secretKey;
        }
      }
      if (data.steadfast.baseUrl !== undefined) settings.steadfast.baseUrl = data.steadfast.baseUrl;
      if (data.steadfast.isActive !== undefined) settings.steadfast.isActive = data.steadfast.isActive;
    }

    if (data.charges) {
      if (data.charges.insideDhaka !== undefined) settings.charges.insideDhaka = data.charges.insideDhaka;
      if (data.charges.outsideDhaka !== undefined) settings.charges.outsideDhaka = data.charges.outsideDhaka;
      if (data.charges.extraPerKg !== undefined) settings.charges.extraPerKg = data.charges.extraPerKg;
      if (data.charges.baseWeightKg !== undefined) settings.charges.baseWeightKg = data.charges.baseWeightKg;
    }

    if (data.fraud) {
      if (data.fraud.provider !== undefined) settings.fraud.provider = data.fraud.provider;
      if (data.fraud.apiUrl !== undefined) settings.fraud.apiUrl = data.fraud.apiUrl;
      if (data.fraud.isActive !== undefined) settings.fraud.isActive = data.fraud.isActive;
      // Only overwrite the token when a non-empty value is supplied (keep current otherwise).
      if (data.fraud.apiToken) {
        try {
          settings.fraud.apiToken = encrypt(data.fraud.apiToken);
        } catch {
          settings.fraud.apiToken = data.fraud.apiToken;
        }
      }
    }

    await settings.save();

    sendSuccess(res, { saved: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/delivery-settings/test — test Steadfast connection
router.post('/test', requirePermission('delivery.edit'), async (_req, res, next) => {
  try {
    const balance = await getSteadfastBalance();
    sendSuccess(res, { connected: true, balance: balance.current_balance });
  } catch (err) {
    sendError(res, (err as Error).message, 502, 'STEADFAST_ERROR');
  }
});

export default router;
