import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import rolesRouter from './roles.routes.js';
import usersRouter from './users.routes.js';
import productsRouter from './products.routes.js';
import uploadRouter from './upload.routes.js';
import ordersRouter from './orders.routes.js';
import customersRouter from './customers.routes.js';
import transactionsRouter from './transactions.routes.js';
import accountsRouter from './accounts.routes.js';
import dashboardRouter from './dashboard.routes.js';
import landingPagesRouter from './landing-pages.routes.js';
import deliverySettingsRouter from './delivery-settings.routes.js';
import smsSettingsRouter from './sms-settings.routes.js';
import stockRouter from './stock.routes.js';
import abandonedOrdersRouter from './abandoned-orders.routes.js';
import categoriesRouter from './categories.routes.js';

const router: Router = Router();

router.use(authenticate);
router.use('/roles', rolesRouter);
router.use('/users', usersRouter);
router.use('/products', productsRouter);
router.use('/upload', uploadRouter);
router.use('/orders', ordersRouter);
router.use('/customers', customersRouter);
router.use('/transactions', transactionsRouter);
router.use('/accounts', accountsRouter);
router.use('/dashboard', dashboardRouter);
router.use('/landing-pages', landingPagesRouter);
router.use('/delivery-settings', deliverySettingsRouter);
router.use('/sms-settings', smsSettingsRouter);
router.use('/stock', stockRouter);
router.use('/abandoned-orders', abandonedOrdersRouter);
router.use('/categories', categoriesRouter);

export default router;
