import { Schema, model, type Document } from 'mongoose';

export interface ICustomerAddress {
  label: string;
  address: string;
  city: string;
  area: string;
  isDefault: boolean;
}

export interface ICustomer extends Document {
  phone: string;
  name: string;
  email?: string;
  addresses: ICustomerAddress[];
  totalOrders: number;
  totalSpent: number;
  firstOrderAt: Date | null;
  lastOrderAt: Date | null;
  notes: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<ICustomerAddress>(
  {
    label: { type: String, default: 'Home' },
    address: { type: String, required: true },
    city: { type: String, required: true },
    area: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true },
);

const customerSchema = new Schema<ICustomer>(
  {
    phone: { type: String, required: true, unique: true, index: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, sparse: true },
    addresses: [addressSchema],
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    firstOrderAt: { type: Date, default: null },
    lastOrderAt: { type: Date, default: null },
    notes: { type: String, default: '' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

customerSchema.index({ name: 'text' });

export const Customer = model<ICustomer>('Customer', customerSchema);
