import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Product } from '../../models/Product.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { sendSuccess, sendError, sendPaginated } from '../../utils/api-response.js';
import { deleteImage } from '../../services/storage.service.js';

const router: Router = Router();

const variantSchema = z.object({
  _id: z.string().optional(),
  label: z.string().min(1).trim(),
  price: z.number().min(0),
  stock: z.number().int().min(0),
  reorderPoint: z.number().int().min(0).default(0),
  sku: z.string().trim().default(''),
  weight: z.number().min(0),
  isDefault: z.boolean(),
});

const imageSchema = z.object({
  url: z.string().url(),
  publicId: z.string(),
  alt: z.string().default(''),
});

const productSchema = z.object({
  name: z.string().min(1).trim(),
  slug: z.string().min(1).toLowerCase().trim(),
  description: z.string().default(''),
  category: z.string().min(1).trim(),
  images: z.array(imageSchema).default([]),
  variants: z
    .array(variantSchema)
    .min(1, 'At least one variant required')
    .refine(
      (variants) => variants.filter((v) => v.isDefault).length === 1,
      'Exactly one variant must be marked as default',
    ),
  isActive: z.boolean().default(true),
});

function buildFilter(query: Record<string, unknown>) {
  const filter: Record<string, unknown> = { deletedAt: null };
  if (query['search']) {
    const escaped = String(query['search']).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter['name'] = { $regex: escaped, $options: 'i' };
  }
  if (query['category']) filter['category'] = query['category'];
  if (query['isActive'] !== undefined) filter['isActive'] = query['isActive'] === 'true';
  return filter;
}

// GET /api/admin/products
router.get('/', requirePermission('products.view'), async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query['page'] ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query['limit'] ?? 20)));
    const skip = (page - 1) * limit;
    const filter = buildFilter(req.query as Record<string, unknown>);
    const sort = (req.query['sort'] as string) ?? '-createdAt';

    const [products, total] = await Promise.all([
      Product.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);

    sendPaginated(res, products, { page, limit, total });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/products/:id
router.get('/:id', requirePermission('products.view'), async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params['id'],
      deletedAt: null,
    }).lean();
    if (!product) {
      sendError(res, 'Product not found', 404, 'NOT_FOUND');
      return;
    }
    sendSuccess(res, product);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/products
router.post('/', requirePermission('products.create'), async (req, res, next) => {
  try {
    const data = productSchema.parse(req.body);

    const slugTaken = await Product.findOne({ slug: data.slug, deletedAt: null });
    if (slugTaken) {
      sendError(res, 'Slug already in use', 409, 'DUPLICATE_KEY');
      return;
    }

    // Assign proper ObjectIds to new variants
    const variants = data.variants.map((v) => ({
      ...v,
      _id: v._id ? new mongoose.Types.ObjectId(v._id) : new mongoose.Types.ObjectId(),
    }));

    const product = await Product.create({ ...data, variants });
    sendSuccess(res, product, 201);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/products/:id
router.patch('/:id', requirePermission('products.edit'), async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params['id'], deletedAt: null });
    if (!product) {
      sendError(res, 'Product not found', 404, 'NOT_FOUND');
      return;
    }

    const data = productSchema.partial().parse(req.body);

    // Check slug uniqueness (excluding self)
    if (data.slug && data.slug !== product.slug) {
      const slugTaken = await Product.findOne({
        slug: data.slug,
        _id: { $ne: product._id },
        deletedAt: null,
      });
      if (slugTaken) {
        sendError(res, 'Slug already in use', 409, 'DUPLICATE_KEY');
        return;
      }
    }

    if (data.variants) {
      const variants = data.variants.map((v) => ({
        ...v,
        _id: v._id ? new mongoose.Types.ObjectId(v._id) : new mongoose.Types.ObjectId(),
      }));
      product.variants = variants as typeof product.variants;
    }

    const { variants: _v, ...rest } = data;
    Object.assign(product, rest);
    await product.save();
    sendSuccess(res, product);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/products/:id — soft delete
router.delete('/:id', requirePermission('products.delete'), async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params['id'], deletedAt: null });
    if (!product) {
      sendError(res, 'Product not found', 404, 'NOT_FOUND');
      return;
    }

    // Soft delete
    product.deletedAt = new Date();
    product.isActive = false;
    await product.save();

    // Clean up uploaded images in background (non-blocking)
    Promise.allSettled(
      product.images
        .filter((img) => img.publicId && !img.publicId.startsWith('dev/'))
        .map((img) => deleteImage(img.publicId)),
    ).catch(() => undefined);

    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/products/categories — distinct category list
router.get('/meta/categories', requirePermission('products.view'), async (_req, res, next) => {
  try {
    const categories = await Product.distinct('category', { deletedAt: null });
    sendSuccess(res, categories);
  } catch (err) {
    next(err);
  }
});

export default router;
