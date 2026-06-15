export interface ProductImage {
  url: string;
  publicId: string;
  alt: string;
}

export interface PreviewPdf {
  url: string;
  publicId: string;
}

export interface CustomDeliveryCharge {
  insideDhaka: number;
  outsideDhaka: number;
}

export interface ProductVariant {
  _id: string;
  label: string;
  price: number;
  regularPrice?: number; // MRP; shown struck-through when > price
  sku: string;
  weight: number;
  isDefault: boolean;
  customDelivery?: CustomDeliveryCharge;
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  images: ProductImage[];
  category: string;
  author?: string;
  publisher?: string;
  translator?: string;
  language?: string;
  binding?: string;
  edition?: string;
  isbn?: string;
  pages?: number;
  publicationYear?: number;
  previewImages?: ProductImage[];
  previewPdf?: PreviewPdf | null;
  variants: ProductVariant[];
  poolStock: number;
  reorderPoint: number;
  isActive: boolean;
  customDeliveryEnabled: boolean;
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
  author?: string;
  publisher?: string;
  translator?: string;
  language?: string;
  binding?: string;
  edition?: string;
  isbn?: string;
  pages?: number;
  publicationYear?: number;
  previewImages?: ProductImage[];
  previewPdf?: PreviewPdf | null;
  variants: Omit<ProductVariant, '_id'>[];
  poolStock?: number;
  reorderPoint?: number;
  isActive?: boolean;
  customDeliveryEnabled?: boolean;
}

export type UpdateProductInput = Partial<CreateProductInput>;
