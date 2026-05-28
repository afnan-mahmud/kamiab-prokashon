export interface ProductImage {
  url: string;
  publicId: string;
  alt: string;
}

export interface ProductVariant {
  _id: string;
  label: string;
  price: number;
  sku: string;
  weight: number;
  isDefault: boolean;
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  images: ProductImage[];
  category: string;
  variants: ProductVariant[];
  poolStock: number;
  reorderPoint: number;
  isActive: boolean;
  totalSold: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  name: string;
  slug?: string;
  description: string;
  images: ProductImage[];
  category: string;
  variants: Omit<ProductVariant, '_id'>[];
  poolStock?: number;
  reorderPoint?: number;
  isActive?: boolean;
}

export type UpdateProductInput = Partial<CreateProductInput>;
