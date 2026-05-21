export type LandingPageTemplate = 'template1' | 'template2' | 'template3' | 'template4';

export type ContentSectionType = 'text' | 'image' | 'video' | 'features' | 'testimonial' | 'faq' | 'why_product' | 'why_us';

export interface TextSection {
  type: 'text';
  content: string;
}

export interface ImageSection {
  type: 'image';
  url: string;
  alt: string;
}

export interface VideoSection {
  type: 'video';
  embedUrl: string;
}

export interface FeatureItem {
  icon: string;
  title: string;
  desc: string;
}

export interface FeaturesSection {
  type: 'features';
  items: FeatureItem[];
}

export interface TestimonialItem {
  name: string;
  text: string;
  rating?: number;
}

export interface TestimonialSection {
  type: 'testimonial';
  items: TestimonialItem[];
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqSection {
  type: 'faq';
  items: FaqItem[];
}

export interface WhyProductSection {
  type: 'why_product';
  items: string[];
}

export interface WhyUsSection {
  type: 'why_us';
  items: string[];
}

export type ContentSection =
  | TextSection
  | ImageSection
  | VideoSection
  | FeaturesSection
  | TestimonialSection
  | FaqSection
  | WhyProductSection
  | WhyUsSection;

export interface LandingPageContent {
  heroImage: { url: string; publicId: string };
  heroTitle: string;
  heroSubtitle: string;
  sections: ContentSection[];
  colors: {
    primary: string;
    accent: string;
    background: string;
  };
  ctaText: string;
}

export interface LandingPage {
  _id: string;
  name: string;
  slug: string;
  template: LandingPageTemplate;
  product: string;
  selectedVariants: string[];
  content: LandingPageContent;
  isActive: boolean;
  views: number;
  conversions: number;
  createdAt: string;
  updatedAt: string;
}
