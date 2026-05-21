import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { StockMovement, type IStockMovement } from '../models/StockMovement.js';

export class StockError extends Error {
  constructor(
    public code: 'INSUFFICIENT_STOCK' | 'PRODUCT_NOT_FOUND',
    message: string,
  ) {
    super(message);
    this.name = 'StockError';
  }
}

export interface CreateMovementInput {
  type: 'purchase' | 'sale' | 'return_resalable' | 'return_damaged' | 'adjustment';
  productId: string;
  variantId: string;
  qty: number;
  orderId?: string;
  orderNumber?: string;
  unitCost?: number;
  supplier?: string;
  purchaseDate?: Date;
  reference?: string;
  note?: string;
  createdBy?: string;
}

export async function createMovement(input: CreateMovementInput): Promise<IStockMovement> {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const product = await Product.findOne(
      { 'variants._id': new mongoose.Types.ObjectId(input.variantId), deletedAt: null },
      { name: 1, 'variants.$': 1 },
    )
      .session(session)
      .lean();

    if (!product || !product.variants[0]) {
      throw new StockError('PRODUCT_NOT_FOUND', 'Product or variant not found');
    }

    const variant = product.variants[0];

    if (input.type === 'sale') {
      const updated = await Product.findOneAndUpdate(
        {
          'variants._id': new mongoose.Types.ObjectId(input.variantId),
          'variants.stock': { $gte: Math.abs(input.qty) },
        },
        { $inc: { 'variants.$.stock': -Math.abs(input.qty) } },
        { new: true, session },
      );
      if (!updated) {
        throw new StockError('INSUFFICIENT_STOCK', `স্টক শেষ — ${variant.label}`);
      }
    } else if (input.type !== 'return_damaged') {
      const delta =
        input.type === 'adjustment' ? input.qty : Math.abs(input.qty);
      await Product.updateOne(
        { 'variants._id': new mongoose.Types.ObjectId(input.variantId) },
        { $inc: { 'variants.$.stock': delta } },
        { session },
      );
    }
    // return_damaged: no stock delta — only the audit record

    const storedQty =
      input.type === 'sale'
        ? -Math.abs(input.qty)
        : input.type === 'adjustment'
        ? input.qty
        : Math.abs(input.qty);

    const movements = await StockMovement.create(
      [
        {
          type: input.type,
          product: new mongoose.Types.ObjectId(input.productId),
          variant: new mongoose.Types.ObjectId(input.variantId),
          qty: storedQty,
          productName: product.name,
          variantLabel: variant.label,
          unitCost: input.unitCost ?? null,
          supplier: input.supplier ?? null,
          purchaseDate: input.purchaseDate ?? null,
          reference: input.reference ?? null,
          orderId: input.orderId ? new mongoose.Types.ObjectId(input.orderId) : null,
          orderNumber: input.orderNumber ?? null,
          note: input.note ?? '',
          createdBy: input.createdBy ? new mongoose.Types.ObjectId(input.createdBy) : null,
        },
      ],
      { session },
    );

    await session.commitTransaction();
    return movements[0] as IStockMovement;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }
}

export interface SaleMovementItem {
  productId: string;
  variantId: string;
  qty: number;
  productName: string;
  variantLabel: string;
  orderId: string;
  orderNumber: string;
}

// Batch all order line-items in one transaction — all succeed or all roll back
export async function createSaleMovements(
  items: SaleMovementItem[],
  createdBy?: string,
): Promise<IStockMovement[]> {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    for (const item of items) {
      const updated = await Product.findOneAndUpdate(
        {
          'variants._id': new mongoose.Types.ObjectId(item.variantId),
          'variants.stock': { $gte: item.qty },
        },
        { $inc: { 'variants.$.stock': -item.qty } },
        { new: true, session },
      );
      if (!updated) {
        throw new StockError('INSUFFICIENT_STOCK', `স্টক শেষ — ${item.variantLabel}`);
      }
    }

    const docs = items.map((item) => ({
      type: 'sale' as const,
      product: new mongoose.Types.ObjectId(item.productId),
      variant: new mongoose.Types.ObjectId(item.variantId),
      qty: -item.qty,
      productName: item.productName,
      variantLabel: item.variantLabel,
      orderId: new mongoose.Types.ObjectId(item.orderId),
      orderNumber: item.orderNumber,
      unitCost: null,
      supplier: null,
      purchaseDate: null,
      reference: null,
      note: '',
      createdBy: createdBy ? new mongoose.Types.ObjectId(createdBy) : null,
    }));

    const created = await StockMovement.insertMany(docs, { session });

    await session.commitTransaction();
    return created as IStockMovement[];
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }
}
