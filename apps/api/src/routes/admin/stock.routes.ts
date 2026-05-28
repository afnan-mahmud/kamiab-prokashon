import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { StockMovement } from '../../models/StockMovement.js';
import { Product } from '../../models/Product.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { sendSuccess, sendError, sendPaginated } from '../../utils/api-response.js';
import { createMovement, StockError } from '../../services/stock.service.js';

const router: Router = Router();

// GET /api/admin/stock/summary
router.get('/summary', requirePermission('stock.view'), async (_req, res, next) => {
  try {
    const products = await Product.find({ deletedAt: null }).lean();

    const lowStockProducts = products
      .filter((p) => p.reorderPoint > 0 && p.poolStock <= p.reorderPoint)
      .map((p) => ({
        productId: String(p._id),
        productName: p.name,
        poolStock: p.poolStock,
        reorderPoint: p.reorderPoint,
      }));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMovementCount = await StockMovement.countDocuments({
      createdAt: { $gte: today },
    });

    sendSuccess(res, { lowStockProducts, todayMovementCount });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/stock/movements
const movementsQuerySchema = z.object({
  productId: z.string().optional(),
  type: z.enum(['purchase', 'sale', 'return_resalable', 'return_damaged', 'adjustment']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.get('/movements', requirePermission('stock.view'), async (req, res, next) => {
  try {
    const query = movementsQuerySchema.parse(req.query);
    const skip = (query.page - 1) * query.limit;

    const filter: Record<string, unknown> = {};
    if (query.productId) {
      filter['product'] = new mongoose.Types.ObjectId(query.productId);
    }
    if (query.type) filter['type'] = query.type;
    if (query.from || query.to) {
      const dateFilter: Record<string, Date> = {};
      if (query.from) {
        const fromDate = new Date(query.from);
        if (isNaN(fromDate.getTime())) {
          sendError(res, 'Invalid from date', 400, 'BAD_REQUEST');
          return;
        }
        dateFilter['$gte'] = fromDate;
      }
      if (query.to) {
        const toDate = new Date(query.to);
        if (isNaN(toDate.getTime())) {
          sendError(res, 'Invalid to date', 400, 'BAD_REQUEST');
          return;
        }
        toDate.setHours(23, 59, 59, 999);
        dateFilter['$lte'] = toDate;
      }
      filter['createdAt'] = dateFilter;
    }

    const [movements, total] = await Promise.all([
      StockMovement.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).lean(),
      StockMovement.countDocuments(filter),
    ]);

    sendPaginated(res, movements, { page: query.page, limit: query.limit, total });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/stock/movements — purchase receipt (product-level, qty in kg)
const addStockSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().min(0.001, 'Qty must be greater than 0'),
  unitCost: z.number().min(0).optional(),
  supplier: z.string().trim().optional(),
  purchaseDate: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  reference: z.string().trim().optional(),
  note: z.string().default(''),
});

router.post('/movements', requirePermission('stock.edit'), async (req, res, next) => {
  try {
    const data = addStockSchema.parse(req.body);
    const movement = await createMovement({
      type: 'purchase',
      productId: data.productId,
      qty: data.qty,
      unitCost: data.unitCost,
      supplier: data.supplier,
      purchaseDate: data.purchaseDate,
      reference: data.reference,
      note: data.note,
      createdBy: req.user?._id ? String(req.user._id) : undefined,
    });
    sendSuccess(res, movement, 201);
  } catch (err) {
    if (err instanceof StockError && err.code === 'PRODUCT_NOT_FOUND') {
      sendError(res, err.message, 404, 'NOT_FOUND');
      return;
    }
    next(err);
  }
});

// POST /api/admin/stock/adjust — manual adjustment (product-level, qty in kg, can be negative)
const adjustStockSchema = z.object({
  productId: z.string().min(1),
  qty: z
    .number()
    .refine((n) => n !== 0, { message: 'Qty cannot be zero' }),
  note: z.string().min(1, 'Note is required for adjustments'),
});

router.post('/adjust', requirePermission('stock.edit'), async (req, res, next) => {
  try {
    const data = adjustStockSchema.parse(req.body);
    const movement = await createMovement({
      type: 'adjustment',
      productId: data.productId,
      qty: data.qty,
      note: data.note,
      createdBy: req.user?._id ? String(req.user._id) : undefined,
    });
    sendSuccess(res, movement, 201);
  } catch (err) {
    if (err instanceof StockError) {
      sendError(res, err.message, err.code === 'PRODUCT_NOT_FOUND' ? 404 : 409, err.code);
      return;
    }
    next(err);
  }
});

export default router;
