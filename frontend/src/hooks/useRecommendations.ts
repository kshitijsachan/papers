import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { RecommendationsResponse, Paper } from '../types/paper';
import { useAddPaper } from './usePapers';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function fetchRecommendations(): Promise<RecommendationsResponse> {
  const res = await fetch(`${API_BASE}/recommendations`);
  if (!res.ok) throw new Error('Failed to fetch recommendations');
  return res.json();
}

export function useRecommendations() {
  return useQuery({
    queryKey: ['recommendations'],
    queryFn: fetchRecommendations,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useRefreshRecommendations() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['recommendations'] });
  };
}

export function useSaveRecommendation() {
  const addPaper = useAddPaper();
  const queryClient = useQueryClient();

  return {
    ...addPaper,
    mutate: (paper: Omit<Paper, 'id' | 'created_at'>) => {
      addPaper.mutate(paper, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['papers'] });
        },
      });
    },
  };
}
