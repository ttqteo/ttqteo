export interface NewsResponse {
  status: string;
  totalResults: number;
  articles: News[];
}
export interface News {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string | null;
  description: string;
  url: string;
  urlToImage: string;
  publishedAt: string;
  content: string;
}
