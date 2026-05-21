import { Router } from 'express';
import { z } from 'zod';
import { SmsSettings } from '../../models/SmsSettings.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { sendSuccess } from '../../utils/api-response.js';
import { encrypt, decrypt } from '../../utils/encryption.js';

const router: Router = Router();

function safeDecrypt(val: string): string {
  if (!val) return '';
  try {
    return decrypt(val);
  } catch {
    return val;
  }
}

function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  return key.slice(0, 4) + '••••••••' + key.slice(-4);
}

// GET /api/admin/sms-settings
router.get('/', requirePermission('settings.view'), async (_req, res, next) => {
  try {
    const existing = await SmsSettings.findOne().lean();
    const settings = existing ?? (await SmsSettings.create({})).toObject();

    sendSuccess(res, {
      bulksmsbd: {
        apiKeyMasked: maskKey(safeDecrypt(settings.bulksmsbd.apiKey)),
        hasApiKey: !!settings.bulksmsbd.apiKey,
        senderId: settings.bulksmsbd.senderId,
        isActive: settings.bulksmsbd.isActive,
      },
      templates: settings.templates,
    });
  } catch (err) {
    next(err);
  }
});

const updateSchema = z.object({
  bulksmsbd: z
    .object({
      apiKey: z.string().optional(),
      senderId: z.string().optional(),
      isActive: z.boolean().optional(),
    })
    .optional(),
  templates: z
    .object({
      orderConfirmed: z.string().optional(),
      orderShipped: z.string().optional(),
      orderCancelled: z.string().optional(),
    })
    .optional(),
});

// PATCH /api/admin/sms-settings
router.patch('/', requirePermission('settings.edit'), async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);

    let settings = await SmsSettings.findOne();
    if (!settings) settings = new SmsSettings({});

    if (data.bulksmsbd) {
      if (data.bulksmsbd.apiKey !== undefined && data.bulksmsbd.apiKey !== '') {
        try {
          settings.bulksmsbd.apiKey = encrypt(data.bulksmsbd.apiKey);
        } catch {
          settings.bulksmsbd.apiKey = data.bulksmsbd.apiKey;
        }
      }
      if (data.bulksmsbd.senderId !== undefined) settings.bulksmsbd.senderId = data.bulksmsbd.senderId;
      if (data.bulksmsbd.isActive !== undefined) settings.bulksmsbd.isActive = data.bulksmsbd.isActive;
    }

    if (data.templates) {
      if (data.templates.orderConfirmed !== undefined) settings.templates.orderConfirmed = data.templates.orderConfirmed;
      if (data.templates.orderShipped !== undefined) settings.templates.orderShipped = data.templates.orderShipped;
      if (data.templates.orderCancelled !== undefined) settings.templates.orderCancelled = data.templates.orderCancelled;
    }

    await settings.save();
    sendSuccess(res, { saved: true });
  } catch (err) {
    next(err);
  }
});

export default router;
