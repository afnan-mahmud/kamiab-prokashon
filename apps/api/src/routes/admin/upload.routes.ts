import { Router } from 'express';
import multer from 'multer';
import { uploadImage } from '../../services/storage.service.js';
import { compressVideo } from '../../services/video.service.js';
import { requirePermission, requireAnyPermission } from '../../middleware/require-permission.js';
import { sendSuccess, sendError } from '../../utils/api-response.js';

const router: Router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter(_req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }
    cb(null, true);
  },
});

const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter(_req, file, cb) {
    if (!file.mimetype.startsWith('video/')) {
      cb(new Error('Only video files are allowed'));
      return;
    }
    cb(null, true);
  },
});

const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('Only PDF files are allowed'));
      return;
    }
    cb(null, true);
  },
});

// POST /api/admin/upload — shared image upload, reachable from several feature areas
router.post(
  '/',
  requireAnyPermission(
    'products.create',
    'categories.create',
    'authors.create',
    'authors.edit',
    'publishers.create',
    'publishers.edit',
    'banners.create',
    'landing.create',
  ),
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        sendError(res, 'No file provided', 400, 'BAD_REQUEST');
        return;
      }
      const result = await uploadImage(req.file.buffer, {
        mimetype: req.file.mimetype,
        originalName: req.file.originalname,
        req,
      });
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/admin/upload/video — compresses then stores locally
router.post(
  '/video',
  requirePermission('products.create'),
  uploadVideo.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        sendError(res, 'No file provided', 400, 'BAD_REQUEST');
        return;
      }
      const compressed = await compressVideo(req.file.buffer, req.file.originalname);
      const result = await uploadImage(compressed, {
        mimetype: 'video/mp4',
        originalName: req.file.originalname,
        folder: 'landing-videos',
        req,
      });
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/admin/upload/pdf — book preview sample
router.post(
  '/pdf',
  requirePermission('products.create'),
  uploadPdf.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        sendError(res, 'No file provided', 400, 'BAD_REQUEST');
        return;
      }
      const result = await uploadImage(req.file.buffer, {
        mimetype: req.file.mimetype,
        originalName: req.file.originalname,
        folder: 'preview-pdfs',
        req,
      });
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
