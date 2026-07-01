import { Router } from 'express';
import productsRouter from './products.routes.js';
import customersRouter from './customers.routes.js';
import ordersRouter from './orders.routes.js';
import deliveryRouter from './delivery.routes.js';
import landingRouter from './landing.routes.js';
import abandonedRouter from './abandoned.routes.js';
import categoriesRouter from './categories.routes.js';
import authorsRouter from './authors.routes.js';
import publishersRouter from './publishers.routes.js';
import bannersRouter from './banners.routes.js';

const router: Router = Router();

router.use('/products', productsRouter);
router.use('/customers', customersRouter);
router.use('/orders', ordersRouter);
router.use('/delivery', deliveryRouter);
router.use('/landing', landingRouter);
router.use('/abandoned', abandonedRouter);
router.use('/categories', categoriesRouter);
router.use('/authors', authorsRouter);
router.use('/publishers', publishersRouter);
router.use('/banners', bannersRouter);

export default router;
