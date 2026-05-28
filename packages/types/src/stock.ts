export type StockMovementType =
  | 'purchase'
  | 'sale'
  | 'return_resalable'
  | 'return_damaged'
  | 'adjustment';

export interface StockMovement {
  _id: string;
  type: StockMovementType;
  product: string;
  variant: string | null;
  qty: number;
  productName: string;
  variantLabel: string;
  unitCost: number | null;
  supplier: string | null;
  purchaseDate: string | null;
  reference: string | null;
  orderId: string | null;
  orderNumber: string | null;
  note: string;
  createdBy: string | null;
  createdAt: string;
}

export interface StockSummary {
  lowStockProducts: Array<{
    productId: string;
    productName: string;
    poolStock: number;
    reorderPoint: number;
  }>;
  todayMovementCount: number;
}

export interface AddStockInput {
  productId: string;
  qty: number;
  unitCost?: number;
  supplier?: string;
  purchaseDate?: string;
  reference?: string;
  note?: string;
}

export interface AdjustStockInput {
  productId: string;
  qty: number;
  note: string;
}

export interface ProcessReturnItem {
  variantId: string;
  resalableQty: number;
  damagedQty: number;
}

export interface ProcessReturnInput {
  items: ProcessReturnItem[];
  note?: string;
}
