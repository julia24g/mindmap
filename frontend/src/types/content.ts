export interface Content {
  contentId: string;
  userId: string;
  title: string;
  type?: string;
  created_at: string;
  properties?: Record<string, any>;
}
