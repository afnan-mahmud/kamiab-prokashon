export interface AuthorImage {
  url: string;
  publicId: string;
}

export interface Author {
  _id: string;
  name: string;
  bio?: string;
  image?: AuthorImage | null;
  order: number;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAuthorInput {
  name: string;
  bio?: string;
  image?: AuthorImage | null;
  order?: number;
  isActive?: boolean;
}

export type UpdateAuthorInput = Partial<CreateAuthorInput>;

/** Public author detail: managed record (or a synthesized `{ name }`) plus their books. */
export interface AuthorDetail {
  author: { _id?: string; name: string; bio?: string; image?: AuthorImage | null };
  products: import('./product.js').Product[];
}
