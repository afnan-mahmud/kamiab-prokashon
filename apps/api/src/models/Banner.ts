import { Schema, model, type Document } from 'mongoose';

export interface IBanner extends Document {
  title?: string;
  desktopImage: { url: string; publicId: string };
  mobileImage: { url: string; publicId: string };
  link?: string;
  order: number;
  isActive: boolean;
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

const bannerSchema = new Schema<IBanner>(
  {
    title: { type: String, trim: true },
    desktopImage: { type: imageSchema, required: true },
    mobileImage: { type: imageSchema, required: true },
    link: { type: String, trim: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

bannerSchema.index({ isActive: 1, order: 1 });

export const Banner = model<IBanner>('Banner', bannerSchema);
