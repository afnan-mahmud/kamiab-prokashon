import { Schema, model, type Document } from 'mongoose';

export interface IPublisher extends Document {
  name: string;
  bio?: string;
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

const publisherSchema = new Schema<IPublisher>(
  {
    name: { type: String, required: true, trim: true },
    bio: { type: String, default: '' },
    image: { type: imageSchema, default: undefined },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

publisherSchema.index({ isActive: 1 });

export const Publisher = model<IPublisher>('Publisher', publisherSchema);
