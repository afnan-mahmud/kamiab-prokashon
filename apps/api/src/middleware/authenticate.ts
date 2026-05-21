import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { User } from '../models/User.js';
import { Role } from '../models/Role.js';
import { sendError } from '../utils/api-response.js';

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    sendError(res, 'No token provided', 401, 'UNAUTHORIZED');
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.userId).select('-password').lean();
    if (!user || !user.isActive) {
      sendError(res, 'User not found or inactive', 401, 'UNAUTHORIZED');
      return;
    }

    const role = await Role.findById(user.role).lean();
    if (!role) {
      sendError(res, 'Role not found', 401, 'UNAUTHORIZED');
      return;
    }

    req.user = {
      _id: String(user._id),
      email: user.email,
      name: user.name,
      role: {
        _id: String(role._id),
        name: role.name,
        permissions: role.permissions,
      },
    };

    next();
  } catch {
    sendError(res, 'Invalid or expired token', 401, 'UNAUTHORIZED');
  }
}
