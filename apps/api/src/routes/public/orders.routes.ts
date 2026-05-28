import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import { Product } from '../../models/Product.js';
import { Customer } from '../../models/Customer.js';
import { Order } from '../../models/Order.js';
import { DeliverySettings } from '../../models/DeliverySettings.js';
import { sendSuccess, sendError } from '../../utils/api-response.js';
import { createSaleMovements, StockError } from '../../services/stock.service.js';
import { nextOrderNumber } from '../../models/Counter.js';

const router: Router = Router();

const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: { message: 'Too many orders, try again later', code: 'RATE_LIMITED' } },
});

const createOrderSchema = z.object({
  customerPhone: z.string().min(1).trim(),
  customerName: z.string().min(1).trim(),
  address: z.string().min(1).trim(),
  city: z.string().min(1).trim(),
  area: z.string().min(1).trim(),
  deliveryLocation: z.enum(['inside_dhaka', 'outside_dhaka']),
  paymentMethod: z.enum(['cash', 'bkash', 'card']).default('cash'),
  notes: z.string().default(''),
  source: z.enum(['website', 'landing_page']).default('website'),
  landingPageId: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().min(1),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1),
});

// POST /api/orders
router.post('/', orderLimiter, async (req, res, next) => {
  try {
    const data = createOrderSchema.parse(req.body);

    // Resolve products & variants, build order items
    const productIds = [...new Set(data.items.map((i) => i.productId))];
    const products = await Product.find({
      _id: { $in: productIds },
      isActive: true,
      deletedAt: null,
    }).lean();

    const productMap = new Map(products.map((p) => [String(p._id), p]));

    const orderItems = [];
    for (const item of data.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        sendError(res, `Product ${item.productId} not found or inactive`, 400, 'BAD_REQUEST');
        return;
      }
      const variant = product.variants.find((v) => String(v._id) === item.variantId);
      if (!variant) {
        sendError(res, `Variant ${item.variantId} not found`, 400, 'BAD_REQUEST');
        return;
      }
      orderItems.push({
        product: new mongoose.Types.ObjectId(item.productId),
        productName: product.name,
        variantId: new mongoose.Types.ObjectId(item.variantId),
        variantLabel: variant.label,
        price: variant.price,
        quantity: item.quantity,
        weight: variant.weight,
        subtotal: variant.price * item.quantity,
      });
    }

    // Pre-check stock — group by productId, check poolStock vs total kg needed
    const kgNeededByProduct = new Map<string, number>();
    for (const item of data.items) {
      const product = productMap.get(item.productId);
      const variant = product?.variants.find((v) => String(v._id) === item.variantId);
      if (variant) {
        const current = kgNeededByProduct.get(item.productId) ?? 0;
        kgNeededByProduct.set(item.productId, current + variant.weight * item.quantity);
      }
    }
    for (const [productId, totalKg] of kgNeededByProduct) {
      const product = productMap.get(productId);
      if (product && product.poolStock < totalKg) {
        sendError(
          res,
          `স্টক শেষ — ${product.name} (${product.poolStock} কেজি আছে)`,
          409,
          'INSUFFICIENT_STOCK',
        );
        return;
      }
    }

    // Calculate delivery charge
    const settings = await DeliverySettings.findOne().lean();
    const charges = settings?.charges ?? {
      insideDhaka: 60,
      outsideDhaka: 120,
      extraPerKg: 20,
      baseWeightKg: 1,
    };
    const totalWeight = orderItems.reduce((s, i) => s + i.weight * i.quantity, 0);
    const extraWeight = Math.max(0, totalWeight - charges.baseWeightKg);
    const deliveryCharge =
      (data.deliveryLocation === 'inside_dhaka' ? charges.insideDhaka : charges.outsideDhaka) +
      extraWeight * charges.extraPerKg;

    const subtotal = orderItems.reduce((s, i) => s + i.subtotal, 0);
    const total = subtotal + deliveryCharge;

    // Upsert customer
    const now = new Date();
    const customer = await Customer.findOneAndUpdate(
      { phone: data.customerPhone },
      {
        $set: { lastOrderAt: now },
        $inc: { totalOrders: 1, totalSpent: total },
        $setOnInsert: {
          name: data.customerName,
          firstOrderAt: now,
          addresses: [
            {
              label: 'Home',
              address: data.address,
              city: data.city,
              area: data.area,
              isDefault: true,
            },
          ],
        },
      },
      { upsert: true, new: true },
    );

    const orderNumber = await nextOrderNumber(new Date().getFullYear());

    // Create order
    const order = await Order.create({
      orderNumber,
      customer: customer._id,
      customerSnapshot: {
        phone: data.customerPhone,
        name: data.customerName,
        address: data.address,
        city: data.city,
        area: data.area,
      },
      items: orderItems,
      subtotal,
      deliveryCharge,
      deliveryLocation: data.deliveryLocation,
      discount: 0,
      total,
      paymentMethod: data.paymentMethod,
      paymentStatus: 'pending',
      status: 'Pending',
      source: data.source,
      ...(data.landingPageId && {
        landingPage: new mongoose.Types.ObjectId(data.landingPageId),
      }),
      notes: data.notes,
      createdBy: null,
      statusHistory: [{ status: 'Pending', changedBy: null, changedAt: now }],
    });

    // Decrement stock — atomic batch; if race-condition causes failure, delete the order
    try {
      await createSaleMovements(
        orderItems.map((item) => ({
          productId: String(item.product),
          variantId: String(item.variantId),
          variantLabel: item.variantLabel,
          variantWeight: item.weight,
          qty: item.quantity,
          productName: item.productName,
          orderId: String(order._id),
          orderNumber: order.orderNumber,
        })),
      );
    } catch (stockErr) {
      try {
        await Order.deleteOne({ _id: order._id });
      } catch (delErr) {
        console.error(`Failed to delete orphaned order ${String(order._id)}:`, delErr);
      }
      if (stockErr instanceof StockError && stockErr.code === 'INSUFFICIENT_STOCK') {
        sendError(res, (stockErr as StockError).message, 409, 'INSUFFICIENT_STOCK');
        return;
      }
      throw stockErr;
    }

    sendSuccess(res, { orderNumber: order.orderNumber, orderId: String(order._id), total }, 201);
  } catch (err) {
    next(err);
  }
});

export default router;
