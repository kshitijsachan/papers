import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Paper, SearchResult, Figure } from '../types/paper';

const API_BASE = 'http://localhost:8000';

async function fetchPapers(): Promise<Paper[]> {
  const res = await fetch(`${API_BASE}/papers`);
  if (!res.ok) throw new Error('Failed to fetch papers');
  return res.json();
}

async function fetchPaper(id: number): Promise<Paper> {
  const res = await fetch(`${API_BASE}/papers/${id}`);
  if (!res.ok) throw new Error('Failed to fetch paper');
  return res.json();
}

async function addPaper(paper: Omit<Paper, 'id' | 'created_at'>): Promise<Paper> {
  const res = await fetch(`${API_BASE}/papers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paper),
  });
  if (!res.ok) throw new Error('Failed to add paper');
  return res.json();
}

async function updatePaper(id: number, updates: Partial<Paper>): Promise<Paper> {
  const res = await fetch(`${API_BASE}/papers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update paper');
  return res.json();
}

async function deletePaper(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/papers/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete paper');
}

async function updateNotes(id: number, content: string): Promise<Paper> {
  const res = await fetch(`${API_BASE}/papers/${id}/notes`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes: content }),
  });
  if (!res.ok) throw new Error('Failed to update notes');
  return res.json();
}

async function searchPapers(query: string): Promise<SearchResult[]> {
  const res = await fetch(`${API_BASE}/search?query=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Failed to search papers');
  return res.json();
}

async function fetchFigures(id: number): Promise<Figure[]> {
  const res = await fetch(`${API_BASE}/papers/${id}/figures`);
  if (!res.ok) throw new Error('Failed to fetch figures');
  return res.json();
}

export function usePapers() {
  return useQuery({
    queryKey: ['papers'],
    queryFn: fetchPapers,
  });
}

export function usePaper(id: number | null) {
  return useQuery({
    queryKey: ['paper', id],
    queryFn: () => fetchPaper(id!),
    enabled: id !== null,
  });
}

export function useAddPaper() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addPaper,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['papers'] });
    },
  });
}

export function useUpdatePaper() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Paper> }) =>
      updatePaper(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['papers'] });
    },
  });
}

export function useDeletePaper() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePaper,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['papers'] });
    },
  });
}

export function useUpdateNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) =>
      updateNotes(id, content),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['papers'] });
      queryClient.invalidateQueries({ queryKey: ['paper', id] });
    },
  });
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => searchPapers(query),
    enabled: query.length > 2,
    staleTime: 60000,
  });
}

export function useFigures(id: number | null) {
  return useQuery({
    queryKey: ['figures', id],
    queryFn: () => fetchFigures(id!),
    enabled: id !== null,
    staleTime: 300000,
  });
}
