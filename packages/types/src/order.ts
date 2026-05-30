export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Cancelled'
  | 'Call not received'
  | 'Fake order'
  | 'Hand over to Courier'
  | 'Returned';

export type PaymentMethod = 'cash' | 'bkash' | 'card' | 'steadfast';
export type PaymentStatus = 'pending' | 'paid' | 'failed';
export type DeliveryLocation = 'inside_dhaka' | 'outside_dhaka';
export type OrderSource = 'website' | 'landing_page' | 'manual';

export interface OrderItem {
  product: string;
  productName: string;
  variantId: string;
  variantLabel: string;
  price: number;
  quantity: number;
  weight: number;
  subtotal: number;
}

export interface CustomerSnapshot {
  phone: string;
  name: string;
  address: string;
  city: string;
  area: string;
}

export interface CourierInfo {
  consignmentId?: string;
  trackingCode?: string;
  status?: string;
  lastSyncedAt?: string;
  rawResponse?: Record<string, unknown>;
}

export type FraudSignal = 'green' | 'yellow' | 'red';

export interface FraudCourierBreakdown {
  name: string; // 'steadfast' | 'pathao' | 'redx' | 'paperfly' | ...
  total: number;
  delivered: number;
  cancelled: number;
  ratio: number; // 0–100
}

export interface FraudReport {
  phone: string;
  totalOrders: number;
  delivered: number;
  cancelled: number;
  successRatio: number; // 0–100
  signal: FraudSignal;
  isNewCustomer: boolean; // true when no courier history exists yet
  couriers: FraudCourierBreakdown[];
  checkedAt: string;
  checkedBy?: string | null;
}

export interface StatusHistoryEntry {
  status: OrderStatus;
  changedBy: string | null;
  changedAt: string;
  note?: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  customer: string;
  customerSnapshot: CustomerSnapshot;
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  deliveryLocation: DeliveryLocation;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  source: OrderSource;
  landingPage?: string;
  courier: CourierInfo;
  fraud?: FraudReport;
  notes: string;
  createdBy: string | null;
  statusHistory: StatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderInput {
  customerPhone: string;
  customerName: string;
  address: string;
  city: string;
  area: string;
  deliveryLocation: DeliveryLocation;
  items: {
    productId: string;
    variantId: string;
    quantity: number;
  }[];
  paymentMethod: PaymentMethod;
  notes?: string;
  source?: OrderSource;
  landingPageId?: string;
}
