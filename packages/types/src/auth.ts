export type Permission =
  | 'dashboard.view'
  | 'orders.view'
  | 'orders.create'
  | 'orders.edit'
  | 'orders.delete'
  | 'orders.send_to_courier'
  | 'orders.fraud_check'
  | 'customers.view'
  | 'customers.edit'
  | 'customers.delete'
  | 'accounts.view'
  | 'accounts.income.view'
  | 'accounts.expense.view'
  | 'accounts.expense.create'
  | 'products.view'
  | 'products.create'
  | 'products.edit'
  | 'products.delete'
  | 'landing.view'
  | 'landing.create'
  | 'landing.edit'
  | 'landing.delete'
  | 'delivery.view'
  | 'delivery.edit'
  | 'roles.view'
  | 'roles.create'
  | 'roles.edit'
  | 'roles.delete'
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  | 'settings.view'
  | 'settings.edit'
  | 'stock.view'
  | 'stock.edit';

export interface Role {
  _id: string;
  name: string;
  permissions: Permission[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  roleId: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AdminUser;
  accessToken: string;
}
