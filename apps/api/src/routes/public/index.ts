import { Router } from 'express';
import productsRouter from './products.routes.js';
import customersRouter from './customers.routes.js';
import ordersRouter from './orders.routes.js';
import deliveryRouter from './delivery.routes.js';
import landingRouter from './landing.routes.js';

const router: Router = Router();

router.use('/products', productsRouter);
router.use('/customers', customersRouter);
router.use('/orders', ordersRouter);
router.use('/delivery', deliveryRouter);
router.use('/landing', landingRouter);

export default router;
