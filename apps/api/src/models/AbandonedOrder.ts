import { Schema, model, Document } from 'mongoose';

export interface IAbandonedOrder extends Document {
  phone: string;
  name?: string;
  address?: string;
  source: 'landing_page' | 'checkout';
  landingPageSlug?: string;
  status: 'active' | 'fake';
  createdAt: Date;
  updatedAt: Date;
}

const abandonedOrderSchema = new Schema<IAbandonedOrder>(
  {
    phone: { type: String, required: true, unique: true, index: true },
    name: { type: String },
    address: { type: String },
    source: { type: String, enum: ['landing_page', 'checkout'], required: true },
    landingPageSlug: { type: String },
    status: { type: String, enum: ['active', 'fake'], default: 'active' },
  },
  { timestamps: true },
);

export const AbandonedOrder = model<IAbandonedOrder>('AbandonedOrder', abandonedOrderSchema);
