import { useState, useMemo } from 'react';
import { useRecommendations, useRefreshRecommendations } from '../hooks/useRecommendations';
import { useAddPaper, usePapers } from '../hooks/usePapers';
import type { RecommendedPaper } from '../types/paper';

function getScoreBg(score: number): string {
  if (score >= 8) return 'bg-emerald-500';
  if (score >= 6) return 'bg-amber-400';
  return 'bg-gray-300';
}

function formatTimeAgo(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return 'just now';
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

function formatCitations(count: number | undefined): string {
  if (!count) return '—';
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
}

interface PaperRowProps {
  paper: RecommendedPaper;
  onSave: () => void;
  isSaving: boolean;
  isSaved: boolean;
  showCitations?: boolean;
  libraryAuthors?: Map<string, string[]>; // author name -> paper titles
}

function PaperRow({ paper, onSave, isSaving, isSaved, showCitations, libraryAuthors }: PaperRowProps) {
  const [expanded, setExpanded] = useState(false);
  const publishedDate = paper.published_date
    ? new Date(paper.published_date).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : '—';

  const authors = paper.authors.split(', ');
  const authorDisplay = authors.length > 2
    ? `${authors.slice(0, 2).join(', ')} +${authors.length - 2}`
    : paper.authors;

  // Find matching authors from library
  const matchingAuthors: { name: string; papers: string[] }[] = [];
  if (libraryAuthors) {
    for (const author of authors) {
      const normalizedAuthor = author.trim().toLowerCase();
      for (const [libAuthor, papers] of libraryAuthors) {
        if (libAuthor.toLowerCase() === normalizedAuthor) {
          matchingAuthors.push({ name: author, papers });
          break;
        }
      }
    }
  }

  return (
    <>
      <tr
        className="border-b border-gray-100 hover:bg-gray-50/50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Score bar */}
        <td className="py-3 px-3 w-16">
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${getScoreBg(paper.relevance_score)}`}
                style={{ width: `${paper.relevance_score * 10}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 w-4">{paper.relevance_score}</span>
          </div>
        </td>

        {/* Title & explanation preview */}
        <td className="py-3 px-3">
          <a
            href={paper.arxiv_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors"
          >
            {paper.title}
          </a>
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{paper.explanation}</p>
        </td>

        {/* Authors */}
        <td className="py-3 px-3 w-48 truncate">
          <span className="text-sm text-gray-500">{authorDisplay}</span>
          {matchingAuthors.length > 0 && (
            <span className="ml-1.5 text-xs text-indigo-500" title={`${matchingAuthors.length} author(s) in your library`}>
              ({matchingAuthors.length} in lib)
            </span>
          )}
        </td>

        {/* Date */}
        <td className="py-3 px-3 w-24">
          <span className="text-xs text-gray-400">{publishedDate}</span>
        </td>

        {/* Citations */}
        {showCitations && (
          <td className="py-3 px-3 w-20 text-center">
            <span className="text-xs text-gray-500">
              {formatCitations((paper as RecommendedPaper & { citation_count?: number }).citation_count)}
            </span>
          </td>
        )}

        {/* Actions */}
        <td className="py-3 px-3 w-32" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            <button
              onClick={onSave}
              disabled={isSaving || isSaved}
              className={`px-2 py-1 text-xs font-medium rounded transition-all ${
                isSaved
                  ? 'text-emerald-600'
                  : isSaving
                  ? 'text-gray-400'
                  : 'text-indigo-600 hover:bg-indigo-50'
              }`}
            >
              {isSaved ? '✓' : isSaving ? '...' : 'Save'}
            </button>
            {paper.code_url && (
              <a
                href={paper.code_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                Code
              </a>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded row for full explanation */}
      {expanded && (
        <tr className="bg-gray-50/50">
          <td colSpan={showCitations ? 6 : 5} className="py-3 px-6">
            <p className="text-sm text-gray-600 italic">"{paper.explanation}"</p>
            {paper.abstract && (
              <p className="text-xs text-gray-400 mt-2 line-clamp-3">{paper.abstract}</p>
            )}
            {matchingAuthors.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs font-medium text-indigo-600 mb-1">Authors in your library:</p>
                {matchingAuthors.map(({ name, papers }) => (
                  <p key={name} className="text-xs text-gray-500">
                    <span className="font-medium">{name}</span>: {papers.slice(0, 2).join(', ')}
                    {papers.length > 2 && ` +${papers.length - 2} more`}
                  </p>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

interface PaperTableProps {
  papers: RecommendedPaper[];
  savedPapers: Set<string>;
  savingPapers: Set<string>;
  onSave: (paper: RecommendedPaper) => void;
  showCitations?: boolean;
  libraryAuthors?: Map<string, string[]>;
}

function PaperTable({ papers, savedPapers, savingPapers, onSave, showCitations, libraryAuthors }: PaperTableProps) {
  if (papers.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <table className="w-full table-fixed">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase w-20">Score</th>
            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase">Paper</th>
            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase w-48">Authors</th>
            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase w-24">Date</th>
            {showCitations && (
              <th className="py-2 px-3 text-center text-xs font-medium text-gray-500 uppercase w-20">Cites</th>
            )}
            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase w-28">Actions</th>
          </tr>
        </thead>
        <tbody>
          {papers.map((paper) => {
            const key = paper.arxiv_url || paper.title;
            return (
              <PaperRow
                key={key}
                paper={paper}
                onSave={() => onSave(paper)}
                isSaving={savingPapers.has(key)}
                isSaved={savedPapers.has(key)}
                showCitations={showCitations}
                libraryAuthors={libraryAuthors}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function RecommendationsPage() {
  const { data, isLoading, isFetching, error } = useRecommendations();
  const { data: libraryPapers } = usePapers();
  const refreshRecommendations = useRefreshRecommendations();
  const addPaper = useAddPaper();
  const [savedPapers, setSavedPapers] = useState<Set<string>>(new Set());
  const [savingPapers, setSavingPapers] = useState<Set<string>>(new Set());

  // Build author -> paper titles map from library
  const libraryAuthors = useMemo(() => {
    const authorMap = new Map<string, string[]>();
    if (libraryPapers) {
      for (const paper of libraryPapers) {
        const authors = paper.authors.split(', ');
        for (const author of authors) {
          const normalized = author.trim();
          if (!normalized) continue;
          const existing = authorMap.get(normalized) || [];
          existing.push(paper.title);
          authorMap.set(normalized, existing);
        }
      }
    }
    return authorMap;
  }, [libraryPapers]);

  const handleSave = (paper: RecommendedPaper) => {
    const key = paper.arxiv_url || paper.title;
    if (savedPapers.has(key) || savingPapers.has(key)) return;

    setSavingPapers((prev) => new Set(prev).add(key));

    addPaper.mutate(
      {
        title: paper.title,
        authors: paper.authors,
        abstract: paper.abstract,
        arxiv_url: paper.arxiv_url,
        published_date: paper.published_date,
      },
      {
        onSuccess: () => {
          setSavingPapers((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
          setSavedPapers((prev) => new Set(prev).add(key));
        },
        onError: () => {
          setSavingPapers((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        },
      }
    );
  };

  // Only show loading if we have no cached data at all
  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-gray-500">Loading recommendations...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-red-500">Failed to load recommendations</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-sm text-gray-500 mb-2">No recommendations available</p>
        <p className="text-xs text-gray-400">
          Add more papers to your library to get personalized recommendations
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-400">
            Generated: {formatTimeAgo(data.generated_at)}
          </p>
          {isFetching && (
            <span className="text-xs text-indigo-500 animate-pulse">Refreshing...</span>
          )}
        </div>
        <button
          onClick={refreshRecommendations}
          disabled={isFetching}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            isFetching
              ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
              : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
          }`}
        >
          <svg className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {data.new_papers.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            🆕 New Papers <span className="text-gray-400 font-normal">({data.new_papers.length})</span>
          </h2>
          <PaperTable
            papers={data.new_papers}
            savedPapers={savedPapers}
            savingPapers={savingPapers}
            onSave={handleSave}
            libraryAuthors={libraryAuthors}
          />
        </section>
      )}

      {data.related_papers.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            📚 Related Papers <span className="text-gray-400 font-normal">({data.related_papers.length})</span>
          </h2>
          <PaperTable
            papers={data.related_papers}
            savedPapers={savedPapers}
            savingPapers={savingPapers}
            onSave={handleSave}
            showCitations
            libraryAuthors={libraryAuthors}
          />
        </section>
      )}

      {data.new_papers.length === 0 && data.related_papers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-sm text-gray-500 mb-2">No recommendations yet</p>
          <p className="text-xs text-gray-400">
            Add more papers to your library to get personalized recommendations
          </p>
        </div>
      )}
    </div>
  );
}
