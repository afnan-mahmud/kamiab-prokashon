import { SmsSettings } from '../models/SmsSettings.js';
import { logger } from '../utils/logger.js';

type TemplateKey = 'orderConfirmed' | 'orderShipped' | 'orderCancelled';

interface SendResult {
  skipped?: boolean;
  sent?: boolean;
  response?: unknown;
}

export async function sendSMS(
  phone: string,
  message: string,
  templateKey: TemplateKey,
): Promise<SendResult> {
  const settings = await SmsSettings.findOne().lean();

  if (!settings?.bulksmsbd.isActive) {
    logger.info(`SMS skipped (disabled): ${templateKey} → ${phone}`);
    return { skipped: true };
  }

  const { apiKey, senderId } = settings.bulksmsbd;

  if (!apiKey) {
    logger.warn('SMS apiKey not configured');
    return { skipped: true };
  }

  try {
    const url = new URL('https://bulksmsbd.net/api/smsapi');
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('type', '0');
    url.searchParams.set('number', phone);
    url.searchParams.set('senderid', senderId);
    url.searchParams.set('message', message);

    const res = await fetch(url.toString());
    const body = await res.text();
    logger.info(`SMS sent: ${templateKey} → ${phone}`, { body });
    return { sent: true, response: body };
  } catch (err) {
    logger.error('SMS send failed', { err, templateKey, phone });
    return { skipped: true };
  }
}

export async function getSmsTemplate(key: TemplateKey): Promise<string> {
  const settings = await SmsSettings.findOne().lean();
  return settings?.templates?.[key] ?? '';
}
