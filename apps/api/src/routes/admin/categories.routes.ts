import { Router } from 'express';
import { z } from 'zod';
import { Category } from '../../models/Category.js';
import { Product } from '../../models/Product.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { sendSuccess, sendError } from '../../utils/api-response.js';

const router: Router = Router();

const imageSchema = z.object({ url: z.string().url(), publicId: z.string() });

const categorySchema = z.object({
  name: z.string().min(1).trim(),
  slug: z.string().min(1).toLowerCase().trim(),
  parent: z.string().nullable().optional(),
  image: imageSchema.nullable().optional(),
  order: z.number().default(0),
  isActive: z.boolean().default(true),
});

// GET /api/admin/categories
router.get('/', requirePermission('categories.view'), async (_req, res, next) => {
  try {
    const categories = await Category.find({ deletedAt: null })
      .sort({ order: 1, name: 1 })
      .lean();
    sendSuccess(res, categories);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/categories
router.post('/', requirePermission('categories.create'), async (req, res, next) => {
  try {
    const data = categorySchema.parse(req.body);
    const slugTaken = await Category.findOne({ slug: data.slug, deletedAt: null });
    if (slugTaken) {
      sendError(res, 'Slug already in use', 409, 'DUPLICATE_KEY');
      return;
    }
    const category = await Category.create({ ...data, parent: data.parent ?? null });
    sendSuccess(res, category, 201);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/categories/:id
router.patch('/:id', requirePermission('categories.edit'), async (req, res, next) => {
  try {
    const category = await Category.findOne({ _id: req.params['id'], deletedAt: null });
    if (!category) {
      sendError(res, 'Category not found', 404, 'NOT_FOUND');
      return;
    }
    const data = categorySchema.partial().parse(req.body);
    if (data.slug && data.slug !== category.slug) {
      const slugTaken = await Category.findOne({
        slug: data.slug,
        _id: { $ne: category._id },
        deletedAt: null,
      });
      if (slugTaken) {
        sendError(res, 'Slug already in use', 409, 'DUPLICATE_KEY');
        return;
      }
    }
    if (data.parent && String(data.parent) === String(category._id)) {
      sendError(res, 'Category cannot be its own parent', 400, 'BAD_REQUEST');
      return;
    }
    Object.assign(category, data);
    await category.save();
    sendSuccess(res, category);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/categories/:id — soft delete, blocked if referenced
router.delete('/:id', requirePermission('categories.delete'), async (req, res, next) => {
  try {
    const category = await Category.findOne({ _id: req.params['id'], deletedAt: null });
    if (!category) {
      sendError(res, 'Category not found', 404, 'NOT_FOUND');
      return;
    }
    const childCount = await Category.countDocuments({ parent: category._id, deletedAt: null });
    if (childCount > 0) {
      sendError(res, 'Category has sub-categories; delete or move them first', 409, 'HAS_CHILDREN');
      return;
    }
    const productCount = await Product.countDocuments({ category: category.slug, deletedAt: null });
    if (productCount > 0) {
      sendError(res, 'Category has products; reassign them first', 409, 'HAS_PRODUCTS');
      return;
    }
    category.deletedAt = new Date();
    category.isActive = false;
    await category.save();
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

export default router;
