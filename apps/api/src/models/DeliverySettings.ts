import { Schema, model, type Document } from 'mongoose';

export interface ISteadfastConfig {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
  isActive: boolean;
}

export interface IDeliveryCharges {
  insideDhaka: number;
  outsideDhaka: number;
  extraPerKg: number;
  baseWeightKg: number;
}

export interface IDeliverySettings extends Document {
  steadfast: ISteadfastConfig;
  charges: IDeliveryCharges;
  updatedAt: Date;
}

const steadfastSchema = new Schema<ISteadfastConfig>(
  {
    apiKey: { type: String, default: '' },
    secretKey: { type: String, default: '' },
    baseUrl: { type: String, default: 'https://portal.packzy.com/api/v1' },
    isActive: { type: Boolean, default: false },
  },
  { _id: false },
);

const chargesSchema = new Schema<IDeliveryCharges>(
  {
    insideDhaka: { type: Number, default: 60 },
    outsideDhaka: { type: Number, default: 120 },
    extraPerKg: { type: Number, default: 20 },
    baseWeightKg: { type: Number, default: 1 },
  },
  { _id: false },
);

const deliverySettingsSchema = new Schema<IDeliverySettings>(
  {
    steadfast: { type: steadfastSchema, default: () => ({}) },
    charges: { type: chargesSchema, default: () => ({}) },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export const DeliverySettings = model<IDeliverySettings>(
  'DeliverySettings',
  deliverySettingsSchema,
);
