import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Role } from '../models/Role.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { sendSuccess, sendError } from '../utils/api-response.js';
import { authenticate } from '../middleware/authenticate.js';
import { env } from '../config/env.js';

const router: Router = Router();

const REFRESH_COOKIE = 'refresh_token';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  ...(env.NODE_ENV === 'production' ? { domain: env.COOKIE_DOMAIN } : {}),
};

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email, isActive: true }).select('+password').lean();
    if (!user) {
      sendError(res, 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      sendError(res, 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
      return;
    }

    const role = await Role.findById(user.role).lean();
    if (!role) {
      sendError(res, 'Role not found', 500, 'INTERNAL_ERROR');
      return;
    }

    const payload = {
      userId: String(user._id),
      email: user.email,
      roleId: String(user.role),
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Update lastLogin
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTS);

    sendSuccess(res, {
      accessToken,
      user: {
        _id: String(user._id),
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        role: {
          _id: String(role._id),
          name: role.name,
          permissions: role.permissions,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!token) {
      sendError(res, 'No refresh token', 401, 'UNAUTHORIZED');
      return;
    }

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      res.clearCookie(REFRESH_COOKIE);
      sendError(res, 'Invalid or expired refresh token', 401, 'UNAUTHORIZED');
      return;
    }

    const user = await User.findById(payload.userId).select('-password').lean();
    if (!user || !user.isActive) {
      res.clearCookie(REFRESH_COOKIE);
      sendError(res, 'User not found or inactive', 401, 'UNAUTHORIZED');
      return;
    }

    const role = await Role.findById(user.role).lean();
    if (!role) {
      sendError(res, 'Role not found', 500, 'INTERNAL_ERROR');
      return;
    }

    const newPayload = {
      userId: String(user._id),
      email: user.email,
      roleId: String(user.role),
    };

    const accessToken = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);
    res.cookie(REFRESH_COOKIE, newRefreshToken, COOKIE_OPTS);

    sendSuccess(res, {
      accessToken,
      user: {
        _id: String(user._id),
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        role: {
          _id: String(role._id),
          name: role.name,
          permissions: role.permissions,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    ...(env.NODE_ENV === 'production' ? { domain: env.COOKIE_DOMAIN } : {}),
  });
  sendSuccess(res, { message: 'Logged out' });
});

router.get('/me', authenticate, (req, res) => {
  sendSuccess(res, { user: req.user });
});

export default router;
