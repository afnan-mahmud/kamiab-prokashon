import { Router } from 'express';
import { z } from 'zod';
import { User } from '../../models/User.js';
import { Role } from '../../models/Role.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { sendSuccess, sendError, sendPaginated } from '../../utils/api-response.js';

const router: Router = Router();

const createUserSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  roleId: z.string().min(1),
  isActive: z.boolean().default(true),
});

const updateUserSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  email: z.string().email().toLowerCase().optional(),
  password: z.string().min(8).optional(),
  roleId: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/admin/users
router.get('/', requirePermission('users.view'), async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query['page'] ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query['limit'] ?? 20)));
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find()
        .populate('role', 'name permissions')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(),
    ]);

    sendPaginated(res, users, { page, limit, total });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users/:id
router.get('/:id', requirePermission('users.view'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params['id'])
      .populate('role', 'name permissions')
      .lean();
    if (!user) {
      sendError(res, 'User not found', 404, 'NOT_FOUND');
      return;
    }
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/users
router.post('/', requirePermission('users.create'), async (req, res, next) => {
  try {
    const data = createUserSchema.parse(req.body);
    const role = await Role.findById(data.roleId);
    if (!role) {
      sendError(res, 'Role not found', 404, 'NOT_FOUND');
      return;
    }
    const existing = await User.findOne({ email: data.email });
    if (existing) {
      sendError(res, 'Email already in use', 409, 'DUPLICATE_KEY');
      return;
    }
    const user = await User.create({
      name: data.name,
      email: data.email,
      password: data.password,
      role: role._id,
      isActive: data.isActive,
    });
    const populated = await user.populate('role', 'name permissions');
    sendSuccess(res, populated, 201);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id
router.patch('/:id', requirePermission('users.edit'), async (req, res, next) => {
  try {
    const data = updateUserSchema.parse(req.body);
    const user = await User.findById(req.params['id']);
    if (!user) {
      sendError(res, 'User not found', 404, 'NOT_FOUND');
      return;
    }

    if (data.email && data.email !== user.email) {
      const taken = await User.findOne({ email: data.email });
      if (taken) {
        sendError(res, 'Email already in use', 409, 'DUPLICATE_KEY');
        return;
      }
    }

    if (data.roleId) {
      const role = await Role.findById(data.roleId);
      if (!role) {
        sendError(res, 'Role not found', 404, 'NOT_FOUND');
        return;
      }
      user.role = role._id as typeof user.role;
    }

    if (data.name !== undefined) user.name = data.name;
    if (data.email !== undefined) user.email = data.email;
    if (data.password !== undefined) user.password = data.password;
    if (data.isActive !== undefined) user.isActive = data.isActive;

    await user.save();
    const populated = await user.populate('role', 'name permissions');
    sendSuccess(res, populated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/users/:id
router.delete('/:id', requirePermission('users.delete'), async (req, res, next) => {
  try {
    if (req.user?._id === req.params['id']) {
      sendError(res, 'Cannot delete your own account', 400, 'BAD_REQUEST');
      return;
    }
    const user = await User.findByIdAndDelete(req.params['id']);
    if (!user) {
      sendError(res, 'User not found', 404, 'NOT_FOUND');
      return;
    }
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

export default router;
