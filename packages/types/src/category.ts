export interface CategoryImage {
  url: string;
  publicId: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  parent: string | null;
  image?: CategoryImage | null;
  order: number;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryNode extends Category {
  children: CategoryNode[];
}

export interface CreateCategoryInput {
  name: string;
  slug?: string;
  parent?: string | null;
  image?: CategoryImage | null;
  order?: number;
  isActive?: boolean;
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>;
