export interface Dashboard {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  visibility: string;
  publishedAt?: string | null;
  publicSlug?: string | null;
}
