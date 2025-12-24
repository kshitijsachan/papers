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

export interface RecommendedPaper {
  title: string;
  authors: string;
  abstract?: string;
  arxiv_url?: string;
  published_date?: string;
  code_url?: string;
  relevance_score: number;
  explanation: string;
  citation_count?: number;
}

export interface RecommendationsResponse {
  new_papers: RecommendedPaper[];
  related_papers: RecommendedPaper[];
  generated_at: string;
}
