export interface Paper {
  id: number;
  title: string;
  authors: string;
  abstract?: string;
  url?: string;
  arxiv_url?: string;
  read_status: boolean;
  notes?: string;
  created_at?: string;
  published_date?: string;
}

export interface SearchResult {
  title: string;
  authors: string;
  abstract?: string;
  url?: string;
  arxiv_url?: string;
  arxiv_id?: string;
  published_date?: string;
}

export interface Figure {
  image_url: string;
  svg_content?: string;
  caption?: string;
  ar5iv_link?: string;
}
