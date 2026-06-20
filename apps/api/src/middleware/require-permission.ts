import type { Request, Response, NextFunction } from 'express';
import type { Permission } from '@kamiab/types';
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

// Passes if the user holds ANY of the given permissions. Used by shared
// endpoints (e.g. media upload) reachable from several feature areas.
export function requireAnyPermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Not authenticated', 401, 'UNAUTHORIZED');
      return;
    }
    if (!permissions.some((p) => req.user!.role.permissions.includes(p))) {
      sendError(res, 'Insufficient permissions', 403, 'FORBIDDEN');
      return;
    }
    next();
  };
}
