import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { LandingPage } from '../../models/LandingPage.js';
import { Order } from '../../models/Order.js';
import { Customer } from '../../models/Customer.js';
import { DeliverySettings } from '../../models/DeliverySettings.js';
import { sendSuccess, sendError } from '../../utils/api-response.js';
import { createSaleMovements, StockError } from '../../services/stock.service.js';
import { nextOrderNumber } from '../../models/Counter.js';
import { resolveDeliveryCharge, DEFAULT_CHARGES } from '../../services/delivery.service.js';

const router: Router = Router();

const orderRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many orders, please try again later',
});

// GET /api/landing/:slug
router.get('/:slug', async (req, res, next) => {
  try {
    const lp = await LandingPage.findOne({ slug: req.params['slug'], isActive: true })
      .populate('product', 'name images variants isActive customDeliveryEnabled')
      .lean();

    if (!lp) {
      sendError(res, 'Landing page not found', 404, 'NOT_FOUND');
      return;
    }

    // Increment view count (fire and forget)
    void LandingPage.findByIdAndUpdate(lp._id, { $inc: { views: 1 } });

    sendSuccess(res, lp);
  } catch (err) {
    next(err);
  }
});

// POST /api/landing/:slug/order
const landingOrderSchema = z.object({
  phone: z
    .string()
    .regex(/^01[3-9]\d{8}$/, 'Invalid Bangladeshi phone number'),
  name: z.string().min(1).trim(),
  address: z.string().min(5).trim(),
  city: z.string().trim().optional().default(''),
  area: z.string().trim().optional().default(''),
  deliveryLocation: z.enum(['inside_dhaka', 'outside_dhaka']),
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(100),
  paymentMethod: z.enum(['cash', 'bkash', 'card', 'steadfast']).default('cash'),
  notes: z.string().optional(),
});

router.post('/:slug/order', orderRateLimit, async (req, res, next) => {
  try {
    const lp = await LandingPage.findOne({ slug: req.params['slug'], isActive: true })
      .populate<{
        product: {
          _id: mongoose.Types.ObjectId;
          name: string;
          poolStock: number;
          variants: Array<{
            _id: mongoose.Types.ObjectId;
            label: string;
            price: number;
            weight: number;
            customDelivery?: { insideDhaka: number; outsideDhaka: number };
          }>;
          customDeliveryEnabled: boolean;
        };
      }>('product', 'name poolStock variants customDeliveryEnabled')
      .lean();

    if (!lp) {
      sendError(res, 'Landing page not found', 404, 'NOT_FOUND');
      return;
    }

    const data = landingOrderSchema.parse(req.body);

    const product = lp.product;
    const variant = product.variants.find((v) => String(v._id) === data.variantId);
    if (!variant) {
      sendError(res, 'Variant not found', 400, 'BAD_REQUEST');
      return;
    }

    if (product.poolStock < variant.weight * data.quantity) {
      sendError(res, 'স্টক শেষ', 409, 'INSUFFICIENT_STOCK');
      return;
    }

    // Calculate delivery charge (custom per-variant override wins, else weight-based)
    const settings = await DeliverySettings.findOne().lean();
    const charges = settings?.charges ?? DEFAULT_CHARGES;

    const deliveryCharge = resolveDeliveryCharge(
      [
        {
          weight: variant.weight,
          quantity: data.quantity,
          customDelivery:
            product.customDeliveryEnabled && variant.customDelivery
              ? {
                  insideDhaka: variant.customDelivery.insideDhaka,
                  outsideDhaka: variant.customDelivery.outsideDhaka,
                }
              : null,
        },
      ],
      data.deliveryLocation,
      charges,
    );

    const subtotal = variant.price * data.quantity;
    const total = subtotal + deliveryCharge;

    // Customer upsert
    const customer = await Customer.findOneAndUpdate(
      { phone: data.phone },
      {
        $setOnInsert: { phone: data.phone, createdAt: new Date() },
        $set: { name: data.name, lastOrderAt: new Date() },
        $inc: { totalOrders: 1, totalSpent: total },
      },
      { upsert: true, new: true },
    );

    const orderNumber = await nextOrderNumber(new Date().getFullYear());

    const order = await Order.create({
      orderNumber,
      customer: customer._id,
      customerSnapshot: {
        phone: data.phone,
        name: data.name,
        address: data.address,
        city: data.city,
        area: data.area,
      },
      items: [
        {
          product: product._id,
          productName: product.name,
          variantId: variant._id,
          variantLabel: variant.label,
          price: variant.price,
          quantity: data.quantity,
          weight: variant.weight,
          subtotal,
        },
      ],
      subtotal,
      deliveryCharge,
      deliveryLocation: data.deliveryLocation,
      discount: 0,
      total,
      paymentMethod: data.paymentMethod,
      paymentStatus: 'pending',
      status: 'Pending',
      source: 'landing_page',
      landingPage: lp._id,
      notes: data.notes ?? '',
      statusHistory: [{ status: 'Pending', changedBy: null, changedAt: new Date() }],
    });

    try {
      await createSaleMovements([
        {
          productId: String(product._id),
          variantId: String(variant._id),
          variantLabel: variant.label,
          variantWeight: variant.weight,
          qty: data.quantity,
          productName: product.name,
          orderId: String(order._id),
          orderNumber: order.orderNumber,
        },
      ]);
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

    // Increment conversions (fire and forget)
    void LandingPage.findByIdAndUpdate(lp._id, { $inc: { conversions: 1 } });

    sendSuccess(res, { orderNumber: order.orderNumber, orderId: order._id }, 201);
  } catch (err) {
    next(err);
  }
});

export default router;
