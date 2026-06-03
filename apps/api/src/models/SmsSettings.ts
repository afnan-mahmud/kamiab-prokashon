import { Schema, model, type Document } from 'mongoose';

export interface IBulkSmsBdConfig {
  apiKey: string;
  senderId: string;
  isActive: boolean;
}

export interface ISmsTemplates {
  orderConfirmed: string;
  orderShipped: string;
  orderCancelled: string;
}

export interface ISmsSettings extends Document {
  bulksmsbd: IBulkSmsBdConfig;
  templates: ISmsTemplates;
  updatedAt: Date;
}

const bulkSmsBdSchema = new Schema<IBulkSmsBdConfig>(
  {
    apiKey: { type: String, default: '' },
    senderId: { type: String, default: '' },
    isActive: { type: Boolean, default: false },
  },
  { _id: false },
);

const templatesSchema = new Schema<ISmsTemplates>(
  {
    orderConfirmed: {
      type: String,
      default:
        'আপনার অর্ডার নিশ্চিত হয়েছে। অর্ডার নম্বর: {orderNumber}। ধন্যবাদ - Sodai Kini',
    },
    orderShipped: {
      type: String,
      default:
        'আপনার অর্ডার কুরিয়ারে পাঠানো হয়েছে। ট্র্যাকিং কোড: {trackingCode}। - Sodai Kini',
    },
    orderCancelled: {
      type: String,
      default: 'আপনার অর্ডার ({orderNumber}) বাতিল করা হয়েছে। - Sodai Kini',
    },
  },
  { _id: false },
);

const smsSettingsSchema = new Schema<ISmsSettings>(
  {
    bulksmsbd: { type: bulkSmsBdSchema, default: () => ({}) },
    templates: { type: templatesSchema, default: () => ({}) },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export const SmsSettings = model<ISmsSettings>('SmsSettings', smsSettingsSchema);
