import { Router } from 'express';
import { z } from 'zod';
import { Publisher } from '../../models/Publisher.js';
import { Product } from '../../models/Product.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { sendSuccess, sendError } from '../../utils/api-response.js';

const router: Router = Router();

const imageSchema = z.object({ url: z.string().url(), publicId: z.string() });

const publisherSchema = z.object({
  name: z.string().min(1).trim(),
  bio: z.string().trim().default(''),
  image: imageSchema.nullable().optional(),
  order: z.number().default(0),
  isActive: z.boolean().default(true),
});

// Case-insensitive exact-name matcher for duplicate checks
const nameRegex = (name: string) => new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

// GET /api/admin/publishers
router.get('/', requirePermission('publishers.view'), async (_req, res, next) => {
  try {
    const publishers = await Publisher.find({ deletedAt: null }).sort({ order: 1, name: 1 }).lean();
    sendSuccess(res, publishers);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/publishers
router.post('/', requirePermission('publishers.create'), async (req, res, next) => {
  try {
    const data = publisherSchema.parse(req.body);
    const exists = await Publisher.findOne({ name: nameRegex(data.name), deletedAt: null });
    if (exists) {
      sendError(res, 'A publisher with this name already exists', 409, 'DUPLICATE_KEY');
      return;
    }
    const publisher = await Publisher.create(data);
    sendSuccess(res, publisher, 201);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/publishers/:id
router.patch('/:id', requirePermission('publishers.edit'), async (req, res, next) => {
  try {
    const publisher = await Publisher.findOne({ _id: req.params['id'], deletedAt: null });
    if (!publisher) {
      sendError(res, 'Publisher not found', 404, 'NOT_FOUND');
      return;
    }
    const data = publisherSchema.partial().parse(req.body);
    if (data.name && data.name.toLowerCase() !== publisher.name.toLowerCase()) {
      const exists = await Publisher.findOne({
        name: nameRegex(data.name),
        _id: { $ne: publisher._id },
        deletedAt: null,
      });
      if (exists) {
        sendError(res, 'A publisher with this name already exists', 409, 'DUPLICATE_KEY');
        return;
      }
      // Keep products in sync with the renamed publisher
      await Product.updateMany({ publisher: publisher.name }, { $set: { publisher: data.name } });
    }
    Object.assign(publisher, data);
    await publisher.save();
    sendSuccess(res, publisher);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/publishers/:id — soft delete, blocked if referenced by products
router.delete('/:id', requirePermission('publishers.delete'), async (req, res, next) => {
  try {
    const publisher = await Publisher.findOne({ _id: req.params['id'], deletedAt: null });
    if (!publisher) {
      sendError(res, 'Publisher not found', 404, 'NOT_FOUND');
      return;
    }
    const productCount = await Product.countDocuments({ publisher: publisher.name, deletedAt: null });
    if (productCount > 0) {
      sendError(res, 'Publisher is assigned to products; reassign them first', 409, 'HAS_PRODUCTS');
      return;
    }
    publisher.deletedAt = new Date();
    publisher.isActive = false;
    await publisher.save();
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

export default router;
