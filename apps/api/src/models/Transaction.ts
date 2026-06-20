import { Schema, model, type Document, type Types } from 'mongoose';
import type {
  TransactionType,
  TransactionCategory,
  TransactionPaymentMethod,
} from '@kamiab/types';

export interface ITransactionReference {
  type: 'order' | 'manual' | 'steadfast';
  id?: Types.ObjectId;
}

export interface ITransactionAttachment {
  url: string;
  publicId: string;
}

export interface ITransaction extends Document {
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  date: Date;
  reference: ITransactionReference;
  description: string;
  paymentMethod: TransactionPaymentMethod;
  attachments: ITransactionAttachment[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const referenceSchema = new Schema<ITransactionReference>(
  {
    type: { type: String, enum: ['order', 'manual', 'steadfast'], required: true },
    id: { type: Schema.Types.ObjectId },
  },
  { _id: false },
);

const attachmentSchema = new Schema<ITransactionAttachment>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false },
);

const transactionSchema = new Schema<ITransaction>(
  {
    type: { type: String, enum: ['income', 'expense'], required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    reference: { type: referenceSchema, required: true },
    description: { type: String, default: '' },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bkash', 'card', 'bank'],
      required: true,
    },
    attachments: [attachmentSchema],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

transactionSchema.index({ date: -1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ 'reference.id': 1 });

export const Transaction = model<ITransaction>('Transaction', transactionSchema);
