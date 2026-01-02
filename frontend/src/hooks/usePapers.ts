import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Paper, SearchResult, Figure, Tag } from '../types/paper';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

async function updateNotes(
  id: number,
  data: { notes?: string; experiments?: string }
): Promise<{ notes: string | null; experiments: string | null }> {
  const res = await fetch(`${API_BASE}/papers/${id}/notes`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
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

async function fetchCodeUrls(paperIds: number[]): Promise<Record<string, string | null>> {
  if (paperIds.length === 0) return {};
  const res = await fetch(`${API_BASE}/papers/code-urls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paperIds),
  });
  if (!res.ok) throw new Error('Failed to fetch code URLs');
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
    mutationFn: ({ id, notes, experiments }: { id: number; notes?: string; experiments?: string }) =>
      updateNotes(id, { notes, experiments }),
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

export function useCodeUrls(paperIds: number[]) {
  // Sort IDs for stable query key
  const sortedIds = [...paperIds].sort((a, b) => a - b);
  const queryKey = ['codeUrls', sortedIds.join(',')];

  return useQuery({
    queryKey,
    queryFn: () => fetchCodeUrls(paperIds),
    enabled: paperIds.length > 0,
    staleTime: 3600000, // Cache for 1 hour
  });
}

// Tag API functions

async function fetchTags(): Promise<Tag[]> {
  const res = await fetch(`${API_BASE}/tags`);
  if (!res.ok) throw new Error('Failed to fetch tags');
  return res.json();
}

async function createTag(tag: { name: string; color: string }): Promise<Tag> {
  const res = await fetch(`${API_BASE}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tag),
  });
  if (!res.ok) throw new Error('Failed to create tag');
  return res.json();
}

async function deleteTag(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/tags/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete tag');
}

async function addTagToPaper(paperId: number, tagId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/papers/${paperId}/tags/${tagId}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to add tag to paper');
}

async function removeTagFromPaper(paperId: number, tagId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/papers/${paperId}/tags/${tagId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to remove tag from paper');
}

// Tag hooks

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: fetchTags,
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['papers'] });
    },
  });
}

export function useAddTagToPaper() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ paperId, tagId }: { paperId: number; tagId: number }) =>
      addTagToPaper(paperId, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['papers'] });
    },
  });
}

export function useRemoveTagFromPaper() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ paperId, tagId }: { paperId: number; tagId: number }) =>
      removeTagFromPaper(paperId, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['papers'] });
    },
  });
}
