import { Schema, model, type Document, type Types } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  parent: Types.ObjectId | null;
  image?: { url: string; publicId: string } | null;
  order: number;
  isActive: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const imageSchema = new Schema<{ url: string; publicId: string }>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false },
);

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    image: { type: imageSchema, default: undefined },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ parent: 1 });
categorySchema.index({ isActive: 1 });

export const Category = model<ICategory>('Category', categorySchema);
