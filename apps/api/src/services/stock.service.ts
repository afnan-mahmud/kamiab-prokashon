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
  type: 'purchase' | 'adjustment' | 'return_resalable' | 'return_damaged';
  productId: string;
  variantId?: string; // required for return types (audit trail + weight lookup)
  qty: number;
  unitCost?: number;
  supplier?: string;
  purchaseDate?: Date;
  reference?: string;
  orderId?: string;
  orderNumber?: string;
  note?: string;
  createdBy?: string;
}

export async function createMovement(input: CreateMovementInput): Promise<IStockMovement> {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const product = await Product.findOne(
      { _id: new mongoose.Types.ObjectId(input.productId), deletedAt: null },
      { name: 1, poolStock: 1, variants: 1 },
    )
      .session(session)
      .lean();

    if (!product) {
      throw new StockError('PRODUCT_NOT_FOUND', 'Product not found');
    }

    let delta = 0;
    let variantLabel = '';
    let variantObjectId: import('mongoose').Types.ObjectId | null = null;

    if (input.type === 'purchase') {
      delta = Math.abs(input.qty);
    } else if (input.type === 'adjustment') {
      delta = input.qty;
    } else if (input.type === 'return_resalable') {
      const variant = input.variantId
        ? product.variants.find((v) => String(v._id) === input.variantId)
        : null;
      const weight = variant?.weight ?? 0;
      delta = Math.abs(input.qty) * weight;
      variantLabel = variant?.label ?? '';
      variantObjectId = input.variantId ? new mongoose.Types.ObjectId(input.variantId) : null;
    } else {
      // return_damaged — no poolStock change, just log
      const variant = input.variantId
        ? product.variants.find((v) => String(v._id) === input.variantId)
        : null;
      variantLabel = variant?.label ?? '';
      variantObjectId = input.variantId ? new mongoose.Types.ObjectId(input.variantId) : null;
    }

    if (delta !== 0) {
      await Product.updateOne(
        { _id: new mongoose.Types.ObjectId(input.productId) },
        { $inc: { poolStock: delta } },
        { session },
      );
    }

    const storedQty =
      input.type === 'return_resalable'
        ? delta
        : input.type === 'return_damaged'
          ? 0
          : input.type === 'adjustment'
            ? input.qty
            : Math.abs(input.qty);

    const movements = await StockMovement.create(
      [
        {
          type: input.type,
          product: new mongoose.Types.ObjectId(input.productId),
          variant: variantObjectId,
          qty: storedQty,
          productName: product.name,
          variantLabel,
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
  variantLabel: string;
  variantWeight: number;
  qty: number;
  productName: string;
  orderId: string;
  orderNumber: string;
}

export async function createSaleMovements(
  items: SaleMovementItem[],
  createdBy?: string,
): Promise<IStockMovement[]> {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Group by productId — deduct total kg per product in one atomic op
    const kgByProduct = new Map<string, number>();
    for (const item of items) {
      const current = kgByProduct.get(item.productId) ?? 0;
      kgByProduct.set(item.productId, current + item.variantWeight * item.qty);
    }

    for (const [productId, totalKg] of kgByProduct) {
      const updated = await Product.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(productId),
          poolStock: { $gte: totalKg },
        },
        { $inc: { poolStock: -totalKg } },
        { new: true, session },
      );
      if (!updated) {
        const prod = await Product.findById(productId).session(session).lean();
        const name = prod?.name ?? productId;
        throw new StockError('INSUFFICIENT_STOCK', `স্টক শেষ — ${name}`);
      }
    }

    const docs = items.map((item) => ({
      type: 'sale' as const,
      product: new mongoose.Types.ObjectId(item.productId),
      variant: new mongoose.Types.ObjectId(item.variantId),
      qty: -(item.variantWeight * item.qty),
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
