import { Schema, model, type Document } from 'mongoose';

export interface IProductImage {
  url: string;
  publicId: string;
  alt: string;
}

export interface IProductVariant {
  label: string;
  price: number;
  sku: string;
  weight: number;
  isDefault: boolean;
}

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  images: IProductImage[];
  category: string;
  variants: (IProductVariant & { _id: import('mongoose').Types.ObjectId })[];
  poolStock: number;
  reorderPoint: number;
  isActive: boolean;
  totalSold: number;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const imageSchema = new Schema<IProductImage>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    alt: { type: String, default: '' },
  },
  { _id: false },
);

const variantSchema = new Schema<IProductVariant>(
  {
    label: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    sku: { type: String, trim: true, default: '' },
    weight: { type: Number, required: true, min: 0 },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true },
);

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '' },
    images: [imageSchema],
    category: { type: String, required: true, trim: true },
    variants: {
      type: [variantSchema],
      validate: {
        validator(v: IProductVariant[]) {
          return v.length > 0 && v.filter((x) => x.isDefault).length === 1;
        },
        message: 'Product must have at least one variant with exactly one default',
      },
    },
    poolStock: { type: Number, required: true, min: 0, default: 0 },
    reorderPoint: { type: Number, required: true, min: 0, default: 0 },
    isActive: { type: Boolean, default: true },
    totalSold: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ category: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ name: 'text', description: 'text' });

export const Product = model<IProduct>('Product', productSchema);
