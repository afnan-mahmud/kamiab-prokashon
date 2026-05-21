import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Order } from '../../models/Order.js';
import { Product } from '../../models/Product.js';
import { Customer } from '../../models/Customer.js';
import { DeliverySettings } from '../../models/DeliverySettings.js';
import { Transaction } from '../../models/Transaction.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { sendSuccess, sendError, sendPaginated } from '../../utils/api-response.js';
import { createSteadfastOrder, getSteadfastStatus, SteadfastError } from '../../services/steadfast.service.js';
import { sendSMS, getSmsTemplate } from '../../services/sms.service.js';
import { createSaleMovements, createMovement, StockError } from '../../services/stock.service.js';
import type { OrderStatus } from '@cholonbil/types';

const router: Router = Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildOrderFilter(query: Record<string, unknown>) {
  const filter: Record<string, unknown> = {};
  if (query['status']) filter['status'] = query['status'];
  if (query['paymentMethod']) filter['paymentMethod'] = query['paymentMethod'];
  if (query['paymentStatus']) filter['paymentStatus'] = query['paymentStatus'];
  if (query['source']) filter['source'] = query['source'];

  if (query['search']) {
    const s = String(query['search']);
    filter['$or'] = [
      { orderNumber: { $regex: s, $options: 'i' } },
      { 'customerSnapshot.phone': { $regex: s, $options: 'i' } },
      { 'customerSnapshot.name': { $regex: s, $options: 'i' } },
    ];
  }

  if (query['from'] || query['to']) {
    const dateFilter: Record<string, Date> = {};
    if (query['from']) dateFilter['$gte'] = new Date(String(query['from']));
    if (query['to']) {
      const to = new Date(String(query['to']));
      to.setHours(23, 59, 59, 999);
      dateFilter['$lte'] = to;
    }
    filter['createdAt'] = dateFilter;
  }

  return filter;
}

async function buildOrderItems(
  items: { productId: string; variantId: string; quantity: number }[],
) {
  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await Product.find({
    _id: { $in: productIds },
    deletedAt: null,
  }).lean();
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const orderItems = [];
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) throw new Error(`Product ${item.productId} not found`);
    const variant = product.variants.find((v) => String(v._id) === item.variantId);
    if (!variant) throw new Error(`Variant ${item.variantId} not found`);
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
  return orderItems;
}

async function calcDelivery(
  location: 'inside_dhaka' | 'outside_dhaka',
  totalWeightKg: number,
): Promise<number> {
  const settings = await DeliverySettings.findOne().lean();
  const charges = settings?.charges ?? {
    insideDhaka: 60,
    outsideDhaka: 120,
    extraPerKg: 20,
    baseWeightKg: 1,
  };
  const extra = Math.max(0, totalWeightKg - charges.baseWeightKg);
  return (
    (location === 'inside_dhaka' ? charges.insideDhaka : charges.outsideDhaka) +
    extra * charges.extraPerKg
  );
}

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /api/admin/orders
router.get('/', requirePermission('orders.view'), async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query['page'] ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query['limit'] ?? 20)));
    const skip = (page - 1) * limit;
    const filter = buildOrderFilter(req.query as Record<string, unknown>);
    const sort = (req.query['sort'] as string) ?? '-createdAt';

    const [orders, total] = await Promise.all([
      Order.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Order.countDocuments(filter),
    ]);

    sendPaginated(res, orders, { page, limit, total });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/orders/:id
router.get('/:id', requirePermission('orders.view'), async (req, res, next) => {
  try {
    const order = await Order.findById(req.params['id'])
      .populate('customer', 'name phone email totalOrders totalSpent')
      .populate('createdBy', 'name email')
      .lean();
    if (!order) {
      sendError(res, 'Order not found', 404, 'NOT_FOUND');
      return;
    }
    sendSuccess(res, order);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/orders — manual order creation
const manualOrderSchema = z.object({
  customerPhone: z.string().min(1).trim(),
  customerName: z.string().min(1).trim(),
  address: z.string().min(1).trim(),
  city: z.string().min(1).trim(),
  area: z.string().min(1).trim(),
  deliveryLocation: z.enum(['inside_dhaka', 'outside_dhaka']),
  paymentMethod: z.enum(['cash', 'bkash', 'card', 'steadfast']).default('cash'),
  discount: z.number().min(0).default(0),
  notes: z.string().default(''),
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

router.post('/', requirePermission('orders.create'), async (req, res, next) => {
  try {
    const data = manualOrderSchema.parse(req.body);
    const orderItems = await buildOrderItems(data.items);

    // Pre-check stock
    const stockCheckProductIds = [...new Set(data.items.map((i) => i.productId))];
    const stockCheckProducts = await Product.find({
      _id: { $in: stockCheckProductIds },
      deletedAt: null,
    }).lean();
    const stockProductMap = new Map(stockCheckProducts.map((p) => [String(p._id), p]));

    for (const item of data.items) {
      const prod = stockProductMap.get(item.productId);
      const variant = prod?.variants.find((v) => String(v._id) === item.variantId);
      if (variant && variant.stock < item.quantity) {
        sendError(
          res,
          `স্টক শেষ — ${variant.label} (${variant.stock} টি আছে)`,
          409,
          'INSUFFICIENT_STOCK',
        );
        return;
      }
    }

    const totalWeight = orderItems.reduce((s, i) => s + i.weight * i.quantity, 0);
    const deliveryCharge = await calcDelivery(data.deliveryLocation, totalWeight);
    const subtotal = orderItems.reduce((s, i) => s + i.subtotal, 0);
    const total = subtotal + deliveryCharge - data.discount;
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

    const year = new Date().getFullYear();
    const count = await Order.countDocuments({ orderNumber: new RegExp(`^CBO-${year}-`) });
    const orderNumber = `CBO-${year}-${String(count + 1).padStart(4, '0')}`;

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
      discount: data.discount,
      total,
      paymentMethod: data.paymentMethod,
      paymentStatus: 'pending',
      status: 'Confirmed',
      source: 'manual',
      notes: data.notes,
      createdBy: req.user?._id ? new mongoose.Types.ObjectId(req.user._id) : null,
      statusHistory: [
        {
          status: 'Confirmed',
          changedBy: req.user?._id ? new mongoose.Types.ObjectId(req.user._id) : null,
          changedAt: now,
        },
      ],
    });

    try {
      await createSaleMovements(
        orderItems.map((item) => ({
          productId: String(item.product),
          variantId: String(item.variantId),
          qty: item.quantity,
          productName: item.productName,
          variantLabel: item.variantLabel,
          orderId: String(order._id),
          orderNumber: order.orderNumber,
        })),
        req.user?._id ? String(req.user._id) : undefined,
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

    sendSuccess(res, order, 201);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/orders/:id
const updateOrderSchema = z.object({
  status: z
    .enum(['Pending', 'Confirmed', 'Cancelled', 'Call not received', 'Fake order', 'Hand over to Courier'])
    .optional(),
  paymentStatus: z.enum(['pending', 'paid', 'failed']).optional(),
  paymentMethod: z.enum(['cash', 'bkash', 'card', 'steadfast']).optional(),
  discount: z.number().min(0).optional(),
  notes: z.string().optional(),
  statusNote: z.string().optional(),
});

router.patch('/:id', requirePermission('orders.edit'), async (req, res, next) => {
  try {
    const order = await Order.findById(req.params['id']);
    if (!order) {
      sendError(res, 'Order not found', 404, 'NOT_FOUND');
      return;
    }

    const data = updateOrderSchema.parse(req.body);

    if (data.status && data.status !== order.status) {
      const prevStatus = order.status;
      order.status = data.status as OrderStatus;
      order.statusHistory.push({
        status: data.status as OrderStatus,
        changedBy: req.user?._id ? new mongoose.Types.ObjectId(req.user._id) : null,
        changedAt: new Date(),
        note: data.statusNote,
      });

      // Auto-create income transaction when confirmed (cash/bkash/card only, not steadfast COD)
      if (
        data.status === 'Confirmed' &&
        prevStatus !== 'Confirmed' &&
        ['cash', 'bkash', 'card'].includes(order.paymentMethod)
      ) {
        const existing = await Transaction.findOne({ 'reference.id': order._id, type: 'income' });
        if (!existing && req.user?._id) {
          const categoryMap: Record<string, string> = {
            cash: 'order_cash',
            bkash: 'order_bkash',
            card: 'order_card',
          };
          await Transaction.create({
            type: 'income',
            category: categoryMap[order.paymentMethod] ?? 'order_cash',
            amount: order.total,
            date: new Date(),
            reference: { type: 'order', id: order._id },
            description: `Order ${order.orderNumber}`,
            paymentMethod: order.paymentMethod as 'cash' | 'bkash' | 'card',
            createdBy: new mongoose.Types.ObjectId(req.user._id),
          });
        }
      }

      // SMS hooks (feature-flagged off in v1)
      if (data.status === 'Cancelled' && prevStatus !== 'Cancelled') {
        const msg = await getSmsTemplate('orderCancelled');
        if (msg) void sendSMS(order.customerSnapshot.phone, msg, 'orderCancelled');
      }
    }

    if (data.paymentStatus !== undefined) order.paymentStatus = data.paymentStatus;
    if (data.paymentMethod !== undefined) order.paymentMethod = data.paymentMethod;
    if (data.discount !== undefined) {
      order.discount = data.discount;
      order.total = order.subtotal + order.deliveryCharge - data.discount;
    }
    if (data.notes !== undefined) order.notes = data.notes;

    await order.save();
    sendSuccess(res, order);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/orders/:id/courier — send to Steadfast
router.post('/:id/courier', requirePermission('orders.send_to_courier'), async (req, res, next) => {
  try {
    const order = await Order.findById(req.params['id']);
    if (!order) {
      sendError(res, 'Order not found', 404, 'NOT_FOUND');
      return;
    }

    if (order.status !== 'Confirmed') {
      sendError(res, 'Order must be Confirmed before sending to courier', 400, 'BAD_REQUEST');
      return;
    }

    if (order.courier?.consignmentId) {
      sendError(res, 'Order already sent to courier', 409, 'CONFLICT');
      return;
    }

    const result = await createSteadfastOrder({
      invoice: order.orderNumber,
      recipient_name: order.customerSnapshot.name,
      recipient_phone: order.customerSnapshot.phone,
      recipient_address: `${order.customerSnapshot.address}, ${order.customerSnapshot.area}, ${order.customerSnapshot.city}`,
      cod_amount: order.total,
      note: order.notes || undefined,
    });

    order.courier = {
      consignmentId: result.consignment_id,
      trackingCode: result.tracking_code,
      status: result.status,
      lastSyncedAt: new Date(),
      rawResponse: result as unknown as Record<string, unknown>,
    };
    order.status = 'Hand over to Courier';
    order.statusHistory.push({
      status: 'Hand over to Courier',
      changedBy: req.user?._id ? new mongoose.Types.ObjectId(req.user._id) : null,
      changedAt: new Date(),
      note: `Steadfast consignment: ${result.consignment_id}`,
    });

    await order.save();

    // SMS hook
    const msg = await getSmsTemplate('orderShipped');
    if (msg) void sendSMS(order.customerSnapshot.phone, msg, 'orderShipped');

    sendSuccess(res, order);
  } catch (err) {
    if (err instanceof SteadfastError) {
      sendError(res, err.message, 502, 'STEADFAST_ERROR');
      return;
    }
    next(err);
  }
});

// POST /api/admin/orders/:id/courier/sync — sync status from Steadfast
router.post('/:id/courier/sync', requirePermission('orders.view'), async (req, res, next) => {
  try {
    const order = await Order.findById(req.params['id']);
    if (!order) {
      sendError(res, 'Order not found', 404, 'NOT_FOUND');
      return;
    }

    if (!order.courier?.consignmentId) {
      sendError(res, 'Order has no courier consignment', 400, 'BAD_REQUEST');
      return;
    }

    const result = await getSteadfastStatus(order.courier.consignmentId);
    order.courier.status = result.delivery_status;
    order.courier.lastSyncedAt = new Date();
    await order.save();

    sendSuccess(res, { courierStatus: result.delivery_status });
  } catch (err) {
    if (err instanceof SteadfastError) {
      sendError(res, err.message, 502, 'STEADFAST_ERROR');
      return;
    }
    next(err);
  }
});

// POST /api/admin/orders/:id/return — process courier return
const processReturnSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        resalableQty: z.number().int().min(0),
        damagedQty: z.number().int().min(0),
      }),
    )
    .min(1),
  note: z.string().default(''),
});

router.post('/:id/return', requirePermission('orders.edit'), async (req, res, next) => {
  try {
    const order = await Order.findById(req.params['id']);
    if (!order) {
      sendError(res, 'Order not found', 404, 'NOT_FOUND');
      return;
    }
    if (order.status === 'Returned') {
      sendError(res, 'Order already processed as returned', 409, 'CONFLICT');
      return;
    }

    const data = processReturnSchema.parse(req.body);

    for (const returnItem of data.items) {
      const orderItem = order.items.find((i) => String(i.variantId) === returnItem.variantId);
      if (!orderItem) {
        sendError(res, `Variant ${returnItem.variantId} not in this order`, 400, 'BAD_REQUEST');
        return;
      }
      if (returnItem.resalableQty + returnItem.damagedQty > orderItem.quantity) {
        sendError(
          res,
          `Return qty exceeds ordered qty for ${orderItem.variantLabel}`,
          400,
          'BAD_REQUEST',
        );
        return;
      }
    }

    for (const returnItem of data.items) {
      const orderItem = order.items.find((i) => String(i.variantId) === returnItem.variantId)!;
      const base = {
        productId: String(orderItem.product),
        variantId: returnItem.variantId,
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        note: data.note,
        createdBy: req.user?._id ? String(req.user._id) : undefined,
      };
      if (returnItem.resalableQty > 0) {
        await createMovement({ ...base, type: 'return_resalable', qty: returnItem.resalableQty });
      }
      if (returnItem.damagedQty > 0) {
        await createMovement({ ...base, type: 'return_damaged', qty: returnItem.damagedQty });
      }
    }

    order.status = 'Returned' as OrderStatus;
    order.statusHistory.push({
      status: 'Returned' as OrderStatus,
      changedBy: req.user?._id ? new mongoose.Types.ObjectId(req.user._id) : null,
      changedAt: new Date(),
      note: data.note || 'Courier return processed',
    });
    await order.save();

    sendSuccess(res, order);
  } catch (err) {
    next(err);
  }
});

export default router;
