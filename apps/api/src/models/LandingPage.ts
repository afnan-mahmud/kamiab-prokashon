import { Schema, model, type Document, type Types } from 'mongoose';
import type { LandingPageTemplate, ContentSection } from '@cholonbil/types';

export interface ILandingPageContent {
  heroImage: { url: string; publicId: string };
  heroTitle: string;
  heroSubtitle: string;
  sections: ContentSection[];
  colors: { primary: string; accent: string; background: string };
  ctaText: string;
}

export interface ILandingPage extends Document {
  name: string;
  slug: string;
  template: LandingPageTemplate;
  product: Types.ObjectId;
  selectedVariants: Types.ObjectId[];
  content: ILandingPageContent;
  isActive: boolean;
  views: number;
  conversions: number;
  createdAt: Date;
  updatedAt: Date;
}

const contentSchema = new Schema<ILandingPageContent>(
  {
    heroImage: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
    heroTitle: { type: String, default: '' },
    heroSubtitle: { type: String, default: '' },
    sections: { type: Schema.Types.Mixed, default: [] },
    colors: {
      primary: { type: String, default: '#4a7c2e' },
      accent: { type: String, default: '#e85d04' },
      background: { type: String, default: '#fefcf7' },
    },
    ctaText: { type: String, default: 'অর্ডার করুন' },
  },
  { _id: false },
);

const landingPageSchema = new Schema<ILandingPage>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    template: {
      type: String,
      enum: ['template1', 'template2', 'template3', 'template4'],
      required: true,
    },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    selectedVariants: [{ type: Schema.Types.ObjectId }],
    content: { type: contentSchema, default: () => ({}) },
    isActive: { type: Boolean, default: true },
    views: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
  },
  { timestamps: true },
);

landingPageSchema.index({ slug: 1 }, { unique: true });
landingPageSchema.index({ isActive: 1 });

export const LandingPage = model<ILandingPage>('LandingPage', landingPageSchema);
