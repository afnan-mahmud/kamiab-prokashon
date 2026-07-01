import { Router } from 'express';
import { z } from 'zod';
import { Author } from '../../models/Author.js';
import { Product } from '../../models/Product.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { sendSuccess, sendError } from '../../utils/api-response.js';

const router: Router = Router();

const imageSchema = z.object({ url: z.string().url(), publicId: z.string() });

const authorSchema = z.object({
  name: z.string().min(1).trim(),
  bio: z.string().trim().default(''),
  image: imageSchema.nullable().optional(),
  order: z.number().default(0),
  isActive: z.boolean().default(true),
});

// Case-insensitive exact-name matcher for duplicate checks
const nameRegex = (name: string) => new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

// GET /api/admin/authors
router.get('/', requirePermission('authors.view'), async (_req, res, next) => {
  try {
    const authors = await Author.find({ deletedAt: null }).sort({ order: 1, name: 1 }).lean();
    sendSuccess(res, authors);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/authors
router.post('/', requirePermission('authors.create'), async (req, res, next) => {
  try {
    const data = authorSchema.parse(req.body);
    const exists = await Author.findOne({ name: nameRegex(data.name), deletedAt: null });
    if (exists) {
      sendError(res, 'An author with this name already exists', 409, 'DUPLICATE_KEY');
      return;
    }
    const author = await Author.create(data);
    sendSuccess(res, author, 201);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/authors/:id
router.patch('/:id', requirePermission('authors.edit'), async (req, res, next) => {
  try {
    const author = await Author.findOne({ _id: req.params['id'], deletedAt: null });
    if (!author) {
      sendError(res, 'Author not found', 404, 'NOT_FOUND');
      return;
    }
    const data = authorSchema.partial().parse(req.body);
    if (data.name && data.name.toLowerCase() !== author.name.toLowerCase()) {
      const exists = await Author.findOne({
        name: nameRegex(data.name),
        _id: { $ne: author._id },
        deletedAt: null,
      });
      if (exists) {
        sendError(res, 'An author with this name already exists', 409, 'DUPLICATE_KEY');
        return;
      }
      // Keep products in sync with the renamed author
      await Product.updateMany({ author: author.name }, { $set: { author: data.name } });
    }
    Object.assign(author, data);
    await author.save();
    sendSuccess(res, author);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/authors/:id — soft delete, blocked if referenced by products
router.delete('/:id', requirePermission('authors.delete'), async (req, res, next) => {
  try {
    const author = await Author.findOne({ _id: req.params['id'], deletedAt: null });
    if (!author) {
      sendError(res, 'Author not found', 404, 'NOT_FOUND');
      return;
    }
    const productCount = await Product.countDocuments({ author: author.name, deletedAt: null });
    if (productCount > 0) {
      sendError(res, 'Author is assigned to products; reassign them first', 409, 'HAS_PRODUCTS');
      return;
    }
    author.deletedAt = new Date();
    author.isActive = false;
    await author.save();
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

export default router;
