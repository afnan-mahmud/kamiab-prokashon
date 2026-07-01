import { Router } from 'express';
import { Author } from '../../models/Author.js';
import { Product } from '../../models/Product.js';
import { sendSuccess, sendError } from '../../utils/api-response.js';

const router: Router = Router();

const nameRegex = (name: string) => new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

// GET /api/authors/:name — public author detail + their books
router.get('/:name', async (req, res, next) => {
  try {
    const name = String(req.params['name'] ?? '').trim();
    if (!name) {
      sendError(res, 'Author not found', 404, 'NOT_FOUND');
      return;
    }

    const author = await Author.findOne({
      name: nameRegex(name),
      isActive: true,
      deletedAt: null,
    }).lean();

    const canonicalName = author?.name ?? name;
    const products = await Product.find({
      author: nameRegex(canonicalName),
      isActive: true,
      deletedAt: null,
    })
      .sort('-createdAt')
      .lean();

    if (!author && products.length === 0) {
      sendError(res, 'Author not found', 404, 'NOT_FOUND');
      return;
    }

    sendSuccess(res, {
      author: author
        ? { _id: author._id, name: author.name, bio: author.bio ?? '', image: author.image ?? null }
        : { name: canonicalName },
      products,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
