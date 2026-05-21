export interface ProductImage {
  url: string;
  publicId: string;
  alt: string;
}

export interface ProductVariant {
  _id: string;
  label: string;
  price: number;
  stock: number;
  sku: string;
  weight: number;
  isDefault: boolean;
  reorderPoint: number;
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  images: ProductImage[];
  category: string;
  variants: ProductVariant[];
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
  isActive?: boolean;
}

export type UpdateProductInput = Partial<CreateProductInput>;
