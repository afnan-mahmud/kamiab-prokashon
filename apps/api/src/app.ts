import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.routes.js';
import adminRouter from './routes/admin/index.js';
import publicRouter from './routes/public/index.js';
import { UPLOAD_ROOT } from './services/storage.service.js';

const app: Express = express();

// Allow serving uploaded images cross-origin (Next.js dev runs on a different port).
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
  }),
);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Public routes: moderate limit (customers browsing)
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin routes: high limit (staff with multiple tabs)
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth refresh: enough for many tabs refreshing simultaneously
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/refresh', refreshLimiter);
app.use('/api/admin', adminLimiter);
app.use('/api', publicLimiter);

// Serve uploaded images from local disk
app.use(
  '/uploads',
  express.static(UPLOAD_ROOT, {
    fallthrough: false,
    maxAge: '7d',
    index: false,
  }),
);

app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api', publicRouter);

app.use(errorHandler);

export default app;
