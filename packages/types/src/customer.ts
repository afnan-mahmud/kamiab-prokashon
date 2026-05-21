export interface CustomerAddress {
  _id?: string;
  label: string;
  address: string;
  city: string;
  area: string;
  isDefault: boolean;
}

export interface Customer {
  _id: string;
  phone: string;
  name: string;
  email?: string;
  addresses: CustomerAddress[];
  totalOrders: number;
  totalSpent: number;
  firstOrderAt: string | null;
  lastOrderAt: string | null;
  notes: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerLookupResponse {
  found: boolean;
  customer?: Pick<Customer, '_id' | 'name' | 'addresses'>;
}
