import { Router, type Router as ExpressRouter } from 'express';
import mongoose from 'mongoose';
import { sendSuccess } from '../utils/api-response.js';

const router: ExpressRouter = Router();

router.get('/health', (_req, res) => {
  sendSuccess(res, {
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
