import { Router } from 'express';
import multer from 'multer';
import { uploadImage } from '../../services/storage.service.js';
import { requirePermission } from '../../middleware/require-permission.js';
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

// POST /api/admin/upload
router.post(
  '/',
  requirePermission('products.create'),
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

export default router;
