import { useState, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { usePapers, useUpdatePaper, useDeletePaper, useCodeUrls, useTags } from '../hooks/usePapers';
import { PaperCard } from './PaperCard';
import type { Paper, Tag } from '../types/paper';

type SortOption = 'date' | 'published' | 'title' | 'status';
type FilterOption = 'all' | 'unread' | 'read' | 'starred';
type ViewMode = 'grid' | 'table';

interface PaperGridProps {
  onSelectPaper: (paper: Paper) => void;
  selectedIndex?: number;
}

export interface PaperGridHandle {
  focusFilter: () => void;
  getFilteredPapers: () => Paper[];
}

export const PaperGrid = forwardRef<PaperGridHandle, PaperGridProps>(
  function PaperGrid({ onSelectPaper, selectedIndex }, ref) {
  const [filterQuery, setFilterQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [filterStatus, setFilterStatus] = useState<FilterOption>('all');
  const [filterTags, setFilterTags] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const filterInputRef = useRef<HTMLInputElement>(null);

  const { data: papers, isLoading, error } = usePapers();
  const { data: tags } = useTags();
  const updatePaper = useUpdatePaper();
  const deletePaper = useDeletePaper();

  // Fetch code URLs for all papers
  const paperIds = useMemo(() => {
    if (!papers) return [];
    return papers.map(p => p.id).filter((id): id is number => id !== undefined && id !== null);
  }, [papers]);
  const { data: codeUrls } = useCodeUrls(paperIds);

  const filteredAndSortedPapers = useMemo(() => {
    if (!papers) return [];

    let result = [...papers];

    if (filterQuery.trim()) {
      const query = filterQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.authors.toLowerCase().includes(query)
      );
    }

    if (filterStatus === 'read') {
      result = result.filter((p) => p.read_status);
    } else if (filterStatus === 'unread') {
      result = result.filter((p) => !p.read_status);
    } else if (filterStatus === 'starred') {
      result = result.filter((p) => p.starred);
    }

    // Filter by tags
    if (filterTags.size > 0) {
      result = result.filter((p) =>
        p.tags?.some((t) => filterTags.has(t.id))
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'status':
          return (a.read_status ? 1 : 0) - (b.read_status ? 1 : 0);
        case 'published':
          return (
            new Date(b.published_date || 0).getTime() -
            new Date(a.published_date || 0).getTime()
          );
        case 'date':
        default:
          return (
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
          );
      }
    });

    return result;
  }, [papers, filterQuery, sortBy, filterStatus, filterTags]);

  useImperativeHandle(ref, () => ({
    focusFilter: () => filterInputRef.current?.focus(),
    getFilteredPapers: () => filteredAndSortedPapers,
  }));

  // Selection helpers
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredAndSortedPapers.map(p => p.id!)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const allSelected = filteredAndSortedPapers.length > 0 &&
    filteredAndSortedPapers.every(p => selectedIds.has(p.id!));

  // Bulk actions
  const markSelectedAsRead = () => {
    selectedIds.forEach(id => {
      updatePaper.mutate({ id, updates: { read_status: true } });
    });
    clearSelection();
  };

  const markSelectedAsUnread = () => {
    selectedIds.forEach(id => {
      updatePaper.mutate({ id, updates: { read_status: false } });
    });
    clearSelection();
  };

  const deleteSelected = () => {
    if (confirm(`Delete ${selectedIds.size} paper(s)?`)) {
      selectedIds.forEach(id => {
        deletePaper.mutate(id);
      });
      clearSelection();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-gray-500">Loading papers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-red-500">Failed to load papers</p>
      </div>
    );
  }

  if (!papers || papers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-sm text-gray-500 mb-2">No papers in your library</p>
        <p className="text-xs text-gray-400">
          Use the search bar to find and add papers
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={filterInputRef}
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter by title or author..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 transition-all placeholder:text-gray-400"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 transition-all text-gray-700"
          >
            <option value="date">Sort: Date added</option>
            <option value="published">Sort: Published</option>
            <option value="title">Sort: Title</option>
            <option value="status">Sort: Read status</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterOption)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 transition-all text-gray-700"
          >
            <option value="all">All papers</option>
            <option value="starred">Starred</option>
            <option value="unread">Unread only</option>
            <option value="read">Read only</option>
          </select>

          <div className="flex border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 text-sm transition-colors ${
                viewMode === 'table'
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
              title="Table view"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm transition-colors ${
                viewMode === 'grid'
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
              title="Grid view"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Tag filter row */}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => {
                setFilterTags((prev) => {
                  const next = new Set(prev);
                  if (next.has(tag.id)) next.delete(tag.id);
                  else next.add(tag.id);
                  return next;
                });
              }}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                filterTags.has(tag.id)
                  ? 'ring-2 ring-offset-1'
                  : 'opacity-60 hover:opacity-100'
              }`}
              style={{
                backgroundColor: tag.color + '20',
                color: tag.color,
                borderColor: tag.color,
                ...(filterTags.has(tag.id) ? { ringColor: tag.color } : {}),
              }}
            >
              {tag.name}
            </button>
          ))}
          {filterTags.size > 0 && (
            <button
              onClick={() => setFilterTags(new Set())}
              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {filteredAndSortedPapers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-sm text-gray-500">No papers match your filters</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedPapers.map((paper, index) => (
            <PaperCard
              key={paper.id}
              paper={paper}
              onClick={() => onSelectPaper(paper)}
              isSelected={selectedIndex === index}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 border-b border-indigo-100">
              <span className="text-sm text-indigo-700 font-medium">
                {selectedIds.size} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={markSelectedAsRead}
                  className="px-3 py-1 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-lg hover:bg-emerald-200 transition-colors"
                >
                  Mark read
                </button>
                <button
                  onClick={markSelectedAsUnread}
                  className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Mark unread
                </button>
                <button
                  onClick={deleteSelected}
                  className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Delete
                </button>
              </div>
              <button
                onClick={clearSelection}
                className="ml-auto text-xs text-indigo-600 hover:underline"
              >
                Clear selection
              </button>
            </div>
          )}
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => allSelected ? clearSelection() : selectAll()}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-2 py-3 w-8"></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Authors</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24 hidden sm:table-cell">Published</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Code</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">PDF</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24 hidden sm:table-cell">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAndSortedPapers.map((paper, index) => (
                <tr
                  key={paper.id}
                  onClick={() => onSelectPaper(paper)}
                  className={`cursor-pointer transition-colors hover:bg-indigo-50/50 ${
                    selectedIndex === index ? 'bg-indigo-50' : ''
                  } ${selectedIds.has(paper.id!) ? 'bg-indigo-50/30' : ''}`}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(paper.id!)}
                      onChange={() => toggleSelect(paper.id!)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        if (paper.id) {
                          updatePaper.mutate({ id: paper.id, updates: { starred: !paper.starred } });
                        }
                      }}
                      className={`p-1 rounded transition-colors ${
                        paper.starred
                          ? 'text-amber-500 hover:text-amber-600'
                          : 'text-gray-300 hover:text-amber-400'
                      }`}
                    >
                      <svg className="w-4 h-4" fill={paper.starred ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">{paper.title}</p>
                    {paper.tags && paper.tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {paper.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="px-1.5 py-0.5 text-[10px] font-medium rounded"
                            style={{
                              backgroundColor: tag.color + '20',
                              color: tag.color,
                            }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-sm text-gray-500 line-clamp-1">
                      {paper.authors.split(', ').slice(0, 2).join(', ')}
                      {paper.authors.split(', ').length > 2 && ' et al.'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    <span className="text-xs text-gray-400">
                      {paper.published_date
                        ? new Date(paper.published_date).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (paper.id) {
                          updatePaper.mutate({ id: paper.id, updates: { read_status: !paper.read_status } });
                        }
                      }}
                      className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all hover:scale-105 ${
                        paper.read_status
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-indigo-100 hover:text-indigo-600'
                      }`}
                    >
                      {paper.read_status ? 'read' : 'unread'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    {codeUrls?.[String(paper.id)] ? (
                      <a
                        href={codeUrls[String(paper.id)]!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                      >
                        Code
                      </a>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    {paper.arxiv_url ? (
                      <a
                        href={paper.arxiv_url.replace('/abs/', '/pdf/') + '.pdf'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                      >
                        PDF
                      </a>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    <span className="text-xs text-gray-400">
                      {paper.created_at
                        ? new Date(paper.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })
                        : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});
