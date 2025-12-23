import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useSearch, useAddPaper } from '../hooks/usePapers';
import type { SearchResult } from '../types/paper';

export interface HeaderHandle {
  focusSearch: () => void;
}

export const Header = forwardRef<HeaderHandle>(function Header(_, ref) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: results, isLoading } = useSearch(debouncedQuery);
  const addPaper = useAddPaper();

  useImperativeHandle(ref, () => ({
    focusSearch: () => inputRef.current?.focus(),
  }));

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleAddPaper(result: SearchResult) {
    addPaper.mutate({
      title: result.title,
      authors: result.authors,
      abstract: result.abstract,
      url: result.url,
      arxiv_url: result.arxiv_url,
      read_status: false,
    });
    setQuery('');
    setShowResults(false);
  }

  function truncateAuthors(authors: string, max = 3): string {
    const list = authors.split(', ');
    if (list.length <= max) return authors;
    return list.slice(0, max).join(', ') + ' et al.';
  }

  return (
    <header className="sticky top-0 z-10 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-gray-200/60 px-6 py-4 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <h1 className="text-xl font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Papers</h1>

        <div ref={searchRef} className="relative w-96">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            placeholder="Search papers on arXiv..."
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white/80 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 transition-all placeholder:text-gray-400"
          />

          {showResults && query.length > 2 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200/80 rounded-xl shadow-xl shadow-gray-200/50 max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-sm text-gray-500">Searching...</div>
              ) : results && results.length > 0 ? (
                results.map((result, idx) => (
                  <div
                    key={result.arxiv_id || idx}
                    className="p-3 hover:bg-indigo-50/50 border-b border-gray-100 last:border-0 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {result.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {truncateAuthors(result.authors)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleAddPaper(result)}
                        disabled={addPaper.isPending}
                        className="shrink-0 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-sm text-gray-500">No results found</div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
});
