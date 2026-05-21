export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  totalCustomers: number;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  totalSold: number;
  revenue: number;
}

export interface OrdersByStatus {
  status: string;
  count: number;
}

export interface DashboardData {
  stats: DashboardStats;
  revenueChart: RevenueDataPoint[];
  topProducts: TopProduct[];
  ordersByStatus: OrdersByStatus[];
  recentOrders: RecentOrder[];
}

export interface RecentOrder {
  _id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  total: number;
  status: string;
  createdAt: string;
}
