import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Role } from '../models/Role.js';
import { User } from '../models/User.js';
import { DeliverySettings } from '../models/DeliverySettings.js';
import { SmsSettings } from '../models/SmsSettings.js';
import type { Permission } from '@sodaikini/types';

const ALL_PERMISSIONS: Permission[] = [
  'dashboard.view',
  'orders.view', 'orders.create', 'orders.edit', 'orders.delete', 'orders.send_to_courier', 'orders.fraud_check',
  'customers.view', 'customers.edit', 'customers.delete',
  'accounts.view', 'accounts.income.view', 'accounts.expense.view', 'accounts.expense.create',
  'products.view', 'products.create', 'products.edit', 'products.delete',
  'landing.view', 'landing.create', 'landing.edit', 'landing.delete',
  'delivery.view', 'delivery.edit',
  'roles.view', 'roles.create', 'roles.edit', 'roles.delete',
  'users.view', 'users.create', 'users.edit', 'users.delete',
  'settings.view', 'settings.edit',
  'stock.view', 'stock.edit',
];

async function seed() {
  console.info('🌱 Connecting to MongoDB...');
  await mongoose.connect(env.MONGODB_URI);
  console.info('✅ Connected');

  // Admin role
  let adminRole = await Role.findOne({ name: 'Admin' });
  if (!adminRole) {
    adminRole = await Role.create({
      name: 'Admin',
      permissions: ALL_PERMISSIONS,
      isSystem: true,
    });
    console.info('✅ Created Admin role');
  } else {
    // Ensure all permissions are present on existing admin role
    adminRole.permissions = ALL_PERMISSIONS;
    await adminRole.save();
    console.info('✅ Admin role already exists — permissions synced');
  }

  // Manager role (subset)
  const managerPermissions: Permission[] = [
    'dashboard.view',
    'orders.view', 'orders.create', 'orders.edit', 'orders.send_to_courier', 'orders.fraud_check',
    'customers.view', 'customers.edit',
    'accounts.view', 'accounts.income.view', 'accounts.expense.view',
    'products.view',
    'landing.view',
    'delivery.view',
    'stock.view',
  ];
  const existingManager = await Role.findOne({ name: 'Manager' });
  if (!existingManager) {
    await Role.create({ name: 'Manager', permissions: managerPermissions, isSystem: false });
    console.info('✅ Created Manager role');
  }

  // Operator role
  const operatorPermissions: Permission[] = [
    'dashboard.view',
    'orders.view', 'orders.create', 'orders.edit', 'orders.send_to_courier',
    'customers.view',
    'products.view',
  ];
  const existingOperator = await Role.findOne({ name: 'Operator' });
  if (!existingOperator) {
    await Role.create({ name: 'Operator', permissions: operatorPermissions, isSystem: false });
    console.info('✅ Created Operator role');
  }

  // Default admin user
  const existingAdmin = await User.findOne({ email: 'admin@sodaikini.com' });
  if (!existingAdmin) {
    await User.create({
      name: 'Super Admin',
      email: 'admin@sodaikini.com',
      password: 'Admin@1234',
      role: adminRole._id,
      isActive: true,
    });
    console.info('✅ Created admin user: admin@sodaikini.com / Admin@1234');
    console.info('⚠️  CHANGE THE PASSWORD after first login!');
  } else {
    console.info('✅ Admin user already exists');
  }

  // Delivery settings singleton
  const deliveryCount = await DeliverySettings.countDocuments();
  if (deliveryCount === 0) {
    await DeliverySettings.create({});
    console.info('✅ Created default delivery settings');
  }

  // SMS settings singleton
  const smsCount = await SmsSettings.countDocuments();
  if (smsCount === 0) {
    await SmsSettings.create({});
    console.info('✅ Created default SMS settings (inactive)');
  }

  await mongoose.disconnect();
  console.info('🎉 Seed complete');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
