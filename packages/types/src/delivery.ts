export interface SteadfastConfig {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
  isActive: boolean;
}

export interface DeliveryCharges {
  insideDhaka: number;
  outsideDhaka: number;
  extraPerKg: number;
  baseWeightKg: number;
}

export interface DeliverySettings {
  _id: string;
  steadfast: SteadfastConfig;
  charges: DeliveryCharges;
  updatedAt: string;
}

export interface SmsTemplates {
  orderConfirmed: string;
  orderShipped: string;
  orderCancelled: string;
}

export interface BulkSmsBdConfig {
  apiKey: string;
  senderId: string;
  isActive: boolean;
}

export interface SmsSettings {
  _id: string;
  bulksmsbd: BulkSmsBdConfig;
  templates: SmsTemplates;
  updatedAt: string;
}

export interface DeliveryChargeCalculation {
  deliveryLocation: 'inside_dhaka' | 'outside_dhaka';
  totalWeightKg: number;
  charge: number;
}
