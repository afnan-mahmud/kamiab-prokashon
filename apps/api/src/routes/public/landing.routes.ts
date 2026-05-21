import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { LandingPage } from '../../models/LandingPage.js';
import { Order } from '../../models/Order.js';
import { Product } from '../../models/Product.js';
import { Customer } from '../../models/Customer.js';
import { DeliverySettings } from '../../models/DeliverySettings.js';
import { sendSuccess, sendError } from '../../utils/api-response.js';

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
      .populate('product', 'name images variants isActive')
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
  city: z.string().min(1).trim(),
  area: z.string().min(1).trim(),
  deliveryLocation: z.enum(['inside_dhaka', 'outside_dhaka']),
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(100),
  paymentMethod: z.enum(['cash', 'bkash', 'card', 'steadfast']).default('cash'),
  notes: z.string().optional(),
});

router.post('/:slug/order', orderRateLimit, async (req, res, next) => {
  try {
    const lp = await LandingPage.findOne({ slug: req.params['slug'], isActive: true })
      .populate<{ product: { _id: mongoose.Types.ObjectId; name: string; variants: Array<{ _id: mongoose.Types.ObjectId; label: string; price: number; stock: number; weight: number }> } }>('product', 'name variants')
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

    if (variant.stock < data.quantity) {
      sendError(res, 'Insufficient stock', 400, 'OUT_OF_STOCK');
      return;
    }

    // Calculate delivery charge
    const settings = await DeliverySettings.findOne().lean();
    const charges = settings?.charges ?? {
      insideDhaka: 60,
      outsideDhaka: 120,
      extraPerKg: 10,
      baseWeightKg: 1,
    };

    const totalWeight = variant.weight * data.quantity;
    const extraWeight = Math.max(0, totalWeight - charges.baseWeightKg);
    const baseCharge =
      data.deliveryLocation === 'inside_dhaka' ? charges.insideDhaka : charges.outsideDhaka;
    const deliveryCharge = baseCharge + extraWeight * charges.extraPerKg;

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

    // Order number
    const year = new Date().getFullYear();
    const count = await Order.countDocuments();
    const orderNumber = `CBO-${year}-${String(count + 1).padStart(4, '0')}`;

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

    // Decrement stock
    await Product.findOneAndUpdate(
      { _id: product._id, 'variants._id': variant._id },
      { $inc: { 'variants.$.stock': -data.quantity } },
    );

    // Increment conversions (fire and forget)
    void LandingPage.findByIdAndUpdate(lp._id, { $inc: { conversions: 1 } });

    sendSuccess(res, { orderNumber: order.orderNumber, orderId: order._id }, 201);
  } catch (err) {
    next(err);
  }
});

export default router;
