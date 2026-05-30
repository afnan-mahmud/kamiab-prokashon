import { Router } from 'express';
import { z } from 'zod';
import { Role } from '../../models/Role.js';
import { User } from '../../models/User.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { sendSuccess, sendError } from '../../utils/api-response.js';
import type { Permission } from '@cholonbil/types';

const router: Router = Router();

const ALL_PERMISSIONS: Permission[] = [
  'dashboard.view',
  'orders.view', 'orders.create', 'orders.edit', 'orders.delete', 'orders.send_to_courier', 'orders.fraud_check',
  'customers.view', 'customers.edit', 'customers.delete',
  'accounts.view', 'accounts.income.view', 'accounts.expense.view', 'accounts.expense.create',
  'products.view', 'products.create', 'products.edit', 'products.delete',
  'landing.view', 'landing.create', 'landing.edit', 'landing.delete',
  'delivery.view', 'delivery.edit',
  'roles.view', 'roles.create', 'roles.edit', 'roles.delete',
  'users.view', 'users.create', 'users.edit', 'users.delete',
  'settings.view', 'settings.edit',
];

const roleSchema = z.object({
  name: z.string().min(2).max(50).trim(),
  permissions: z.array(z.string()).refine(
    (perms) => perms.every((p) => ALL_PERMISSIONS.includes(p as Permission)),
    { message: 'Invalid permission key(s)' },
  ),
});

// GET /api/admin/roles
router.get('/', requirePermission('roles.view'), async (_req, res, next) => {
  try {
    const roles = await Role.find().sort({ isSystem: -1, name: 1 }).lean();
    sendSuccess(res, roles);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/roles
router.post('/', requirePermission('roles.create'), async (req, res, next) => {
  try {
    const data = roleSchema.parse(req.body);
    const exists = await Role.findOne({ name: data.name });
    if (exists) {
      sendError(res, 'Role name already exists', 409, 'DUPLICATE_KEY');
      return;
    }
    const role = await Role.create({ ...data, isSystem: false });
    sendSuccess(res, role, 201);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/roles/:id
router.patch('/:id', requirePermission('roles.edit'), async (req, res, next) => {
  try {
    const role = await Role.findById(req.params['id']);
    if (!role) {
      sendError(res, 'Role not found', 404, 'NOT_FOUND');
      return;
    }
    if (role.isSystem) {
      sendError(res, 'System roles cannot be edited', 403, 'FORBIDDEN');
      return;
    }
    const data = roleSchema.parse(req.body);
    Object.assign(role, data);
    await role.save();
    sendSuccess(res, role);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/roles/:id
router.delete('/:id', requirePermission('roles.delete'), async (req, res, next) => {
  try {
    const role = await Role.findById(req.params['id']);
    if (!role) {
      sendError(res, 'Role not found', 404, 'NOT_FOUND');
      return;
    }
    if (role.isSystem) {
      sendError(res, 'System roles cannot be deleted', 403, 'FORBIDDEN');
      return;
    }
    const usersWithRole = await User.countDocuments({ role: role._id });
    if (usersWithRole > 0) {
      sendError(
        res,
        `Cannot delete: ${usersWithRole} user(s) assigned to this role`,
        409,
        'ROLE_IN_USE',
      );
      return;
    }
    await role.deleteOne();
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

export default router;
