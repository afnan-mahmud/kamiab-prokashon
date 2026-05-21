import { Schema, model, type Document, type Types } from 'mongoose';
import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  DeliveryLocation,
  OrderSource,
} from '@cholonbil/types';

export interface IOrderItem {
  product: Types.ObjectId;
  productName: string;
  variantId: Types.ObjectId;
  variantLabel: string;
  price: number;
  quantity: number;
  weight: number;
  subtotal: number;
}

export interface ICustomerSnapshot {
  phone: string;
  name: string;
  address: string;
  city?: string;
  area?: string;
}

export interface ICourierInfo {
  consignmentId?: string;
  trackingCode?: string;
  status?: string;
  lastSyncedAt?: Date;
  rawResponse?: Record<string, unknown>;
}

export interface IStatusHistory {
  status: OrderStatus;
  changedBy: Types.ObjectId | null;
  changedAt: Date;
  note?: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  customer: Types.ObjectId;
  customerSnapshot: ICustomerSnapshot;
  items: IOrderItem[];
  subtotal: number;
  deliveryCharge: number;
  deliveryLocation: DeliveryLocation;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  source: OrderSource;
  landingPage?: Types.ObjectId;
  courier: ICourierInfo;
  notes: string;
  createdBy: Types.ObjectId | null;
  statusHistory: IStatusHistory[];
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    variantId: { type: Schema.Types.ObjectId, required: true },
    variantLabel: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    weight: { type: Number, required: true },
    subtotal: { type: Number, required: true },
  },
  { _id: false },
);

const customerSnapshotSchema = new Schema<ICustomerSnapshot>(
  {
    phone: { type: String, required: true },
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, default: '' },
    area: { type: String, default: '' },
  },
  { _id: false },
);

const courierInfoSchema = new Schema<ICourierInfo>(
  {
    consignmentId: String,
    trackingCode: String,
    status: String,
    lastSyncedAt: Date,
    rawResponse: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const statusHistorySchema = new Schema<IStatusHistory>(
  {
    status: { type: String, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    changedAt: { type: Date, default: Date.now },
    note: String,
  },
  { _id: false },
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    customerSnapshot: { type: customerSnapshotSchema, required: true },
    items: { type: [orderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    deliveryCharge: { type: Number, required: true, default: 0 },
    deliveryLocation: {
      type: String,
      enum: ['inside_dhaka', 'outside_dhaka'],
      required: true,
    },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bkash', 'card', 'steadfast'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },
    status: {
      type: String,
      enum: [
        'Pending',
        'Confirmed',
        'Cancelled',
        'Call not received',
        'Fake order',
        'Hand over to Courier',
        'Returned',
      ],
      default: 'Pending',
    },
    source: {
      type: String,
      enum: ['website', 'landing_page', 'manual'],
      default: 'website',
    },
    landingPage: { type: Schema.Types.ObjectId, ref: 'LandingPage' },
    courier: { type: courierInfoSchema, default: () => ({}) },
    notes: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    statusHistory: [statusHistorySchema],
  },
  { timestamps: true },
);

orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ customer: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'customerSnapshot.phone': 1 });

export const Order = model<IOrder>('Order', orderSchema);
