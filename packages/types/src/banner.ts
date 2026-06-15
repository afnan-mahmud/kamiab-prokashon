export interface BannerImage {
  url: string;
  publicId: string;
}

export interface Banner {
  _id: string;
  title?: string;
  desktopImage: BannerImage;
  mobileImage: BannerImage;
  link?: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBannerInput {
  title?: string;
  desktopImage: BannerImage;
  mobileImage: BannerImage;
  link?: string;
  order?: number;
  isActive?: boolean;
}

export type UpdateBannerInput = Partial<CreateBannerInput>;
