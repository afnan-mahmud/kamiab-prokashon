import { apiClient } from '@/lib/api-client';

export interface DeliverySettingsResponse {
  steadfast: {
    apiKeyMasked: string;
    secretKeyMasked: string;
    baseUrl: string;
    isActive: boolean;
    hasApiKey: boolean;
    hasSecretKey: boolean;
  };
  charges: {
    insideDhaka: number;
    outsideDhaka: number;
    extraPerKg: number;
    baseWeightKg: number;
  };
  fraud: {
    provider: 'mock' | 'bdcourier' | 'fraudbd';
    apiUrl: string;
    isActive: boolean;
    hasApiToken: boolean;
    apiTokenMasked: string;
  };
}

export interface SmsSettingsResponse {
  bulksmsbd: {
    apiKeyMasked: string;
    hasApiKey: boolean;
    senderId: string;
    isActive: boolean;
  };
  templates: {
    orderConfirmed: string;
    orderShipped: string;
    orderCancelled: string;
  };
}

export const settingsApi = {
  getDelivery: () => apiClient.get<DeliverySettingsResponse>('/admin/delivery-settings'),

  updateDelivery: (data: {
    steadfast?: {
      apiKey?: string;
      secretKey?: string;
      baseUrl?: string;
      isActive?: boolean;
    };
    charges?: {
      insideDhaka?: number;
      outsideDhaka?: number;
      extraPerKg?: number;
      baseWeightKg?: number;
    };
    fraud?: {
      provider?: 'mock' | 'bdcourier' | 'fraudbd';
      apiUrl?: string;
      apiToken?: string;
      isActive?: boolean;
    };
  }) => apiClient.patch<{ saved: boolean }>('/admin/delivery-settings', data),

  testSteadfast: () =>
    apiClient.post<{ connected: boolean; balance: number }>('/admin/delivery-settings/test', {}),

  getSms: () => apiClient.get<SmsSettingsResponse>('/admin/sms-settings'),

  updateSms: (data: {
    bulksmsbd?: { apiKey?: string; senderId?: string; isActive?: boolean };
    templates?: { orderConfirmed?: string; orderShipped?: string; orderCancelled?: string };
  }) => apiClient.patch<{ saved: boolean }>('/admin/sms-settings', data),
};
