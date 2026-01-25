export interface Content {
  contentId: string;
  id: string;
  title: string;
  type?: string;
  created_at: string;
  properties?: Record<string, any>;
}
