import { Router } from 'express';
import { Category } from '../../models/Category.js';
import { sendSuccess } from '../../utils/api-response.js';

const router: Router = Router();

interface TreeNode {
  _id: string;
  children: TreeNode[];
  [key: string]: unknown;
}

// GET /api/categories — active category tree, ordered
router.get('/', async (_req, res, next) => {
  try {
    const cats = await Category.find({ isActive: true, deletedAt: null })
      .sort({ order: 1, name: 1 })
      .lean();

    const byId = new Map<string, TreeNode>();
    cats.forEach((c) => byId.set(String(c._id), { ...c, _id: String(c._id), children: [] }));

    const roots: TreeNode[] = [];
    byId.forEach((node) => {
      const parentId = node['parent'] ? String(node['parent']) : null;
      if (parentId && byId.has(parentId)) {
        byId.get(parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    sendSuccess(res, roots);
  } catch (err) {
    next(err);
  }
});

export default router;
