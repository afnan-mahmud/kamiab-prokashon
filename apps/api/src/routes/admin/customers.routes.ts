import { Router } from 'express';
import { z } from 'zod';
import { Customer } from '../../models/Customer.js';
import { Order } from '../../models/Order.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { sendSuccess, sendError, sendPaginated } from '../../utils/api-response.js';

const router: Router = Router();

// GET /api/admin/customers
router.get('/', requirePermission('customers.view'), async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query['page'] ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query['limit'] ?? 20)));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { deletedAt: null };
    const search = req.query['search'] as string | undefined;
    if (search) {
      filter['$or'] = [
        { phone: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    const sort = (req.query['sort'] as string) ?? '-createdAt';

    const [customers, total] = await Promise.all([
      Customer.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Customer.countDocuments(filter),
    ]);

    sendPaginated(res, customers, { page, limit, total });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/customers/:id
router.get('/:id', requirePermission('customers.view'), async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ _id: req.params['id'], deletedAt: null }).lean();
    if (!customer) {
      sendError(res, 'Customer not found', 404, 'NOT_FOUND');
      return;
    }
    sendSuccess(res, customer);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/customers/:id/orders
router.get('/:id/orders', requirePermission('customers.view'), async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query['page'] ?? 1));
    const limit = Math.min(50, Math.max(1, Number(req.query['limit'] ?? 10)));
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find({ customer: req.params['id'] })
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments({ customer: req.params['id'] }),
    ]);

    sendPaginated(res, orders, { page, limit, total });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/customers/:id
const updateCustomerSchema = z.object({
  name: z.string().min(1).trim().optional(),
  email: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional(),
});

router.patch('/:id', requirePermission('customers.edit'), async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ _id: req.params['id'], deletedAt: null });
    if (!customer) {
      sendError(res, 'Customer not found', 404, 'NOT_FOUND');
      return;
    }

    const data = updateCustomerSchema.parse(req.body);
    if (data.name !== undefined) customer.name = data.name;
    if (data.email !== undefined) customer.email = data.email;
    if (data.notes !== undefined) customer.notes = data.notes;

    await customer.save();
    sendSuccess(res, customer);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/customers/:id (soft delete)
router.delete('/:id', requirePermission('customers.delete'), async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ _id: req.params['id'], deletedAt: null });
    if (!customer) {
      sendError(res, 'Customer not found', 404, 'NOT_FOUND');
      return;
    }

    const orderCount = await Order.countDocuments({ customer: customer._id });
    if (orderCount > 0) {
      sendError(res, `Cannot delete customer with ${orderCount} orders`, 409, 'CONFLICT');
      return;
    }

    customer.deletedAt = new Date();
    await customer.save();
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

export default router;
