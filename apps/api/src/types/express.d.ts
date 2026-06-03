import type { Permission } from '@sodaikini/types';

export interface AuthenticatedUser {
  _id: string;
  email: string;
  name: string;
  role: {
    _id: string;
    name: string;
    permissions: Permission[];
  };
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
