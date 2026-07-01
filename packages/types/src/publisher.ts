export interface PublisherImage {
  url: string;
  publicId: string;
}

export interface Publisher {
  _id: string;
  name: string;
  bio?: string;
  image?: PublisherImage | null;
  order: number;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePublisherInput {
  name: string;
  bio?: string;
  image?: PublisherImage | null;
  order?: number;
  isActive?: boolean;
}

export type UpdatePublisherInput = Partial<CreatePublisherInput>;

/** Public publisher detail: managed record (or a synthesized `{ name }`) plus their books. */
export interface PublisherDetail {
  publisher: { _id?: string; name: string; bio?: string; image?: PublisherImage | null };
  products: import('./product.js').Product[];
}
