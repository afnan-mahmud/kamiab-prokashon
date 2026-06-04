import type { Request, Response, NextFunction } from 'express';
import type { Permission } from '@shukhilife/types';
import { sendError } from '../utils/api-response.js';

export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Not authenticated', 401, 'UNAUTHORIZED');
      return;
    }
    if (!req.user.role.permissions.includes(permission)) {
      sendError(res, 'Insufficient permissions', 403, 'FORBIDDEN');
      return;
    }
    next();
  };
}
