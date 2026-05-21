import { Schema, model, type Document, type Types } from 'mongoose';
import type { StockMovementType } from '@cholonbil/types';

export interface IStockMovement extends Document {
  type: StockMovementType;
  product: Types.ObjectId;
  variant: Types.ObjectId;
  qty: number;
  productName: string;
  variantLabel: string;
  unitCost: number | null;
  supplier: string | null;
  purchaseDate: Date | null;
  reference: string | null;
  orderId: Types.ObjectId | null;
  orderNumber: string | null;
  note: string;
  createdBy: Types.ObjectId | null;
  createdAt: Date;
}

const stockMovementSchema = new Schema<IStockMovement>(
  {
    type: {
      type: String,
      enum: ['purchase', 'sale', 'return_resalable', 'return_damaged', 'adjustment'],
      required: true,
    },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variant: { type: Schema.Types.ObjectId, required: true },
    qty: { type: Number, required: true },
    productName: { type: String, required: true },
    variantLabel: { type: String, required: true },
    unitCost: { type: Number, default: null },
    supplier: { type: String, default: null },
    purchaseDate: { type: Date, default: null },
    reference: { type: String, default: null },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    orderNumber: { type: String, default: null },
    note: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

stockMovementSchema.index({ product: 1, variant: 1, createdAt: -1 });
stockMovementSchema.index({ orderId: 1 });
stockMovementSchema.index({ type: 1, createdAt: -1 });

export const StockMovement = model<IStockMovement>('StockMovement', stockMovementSchema);
