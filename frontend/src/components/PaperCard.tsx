import type { Paper } from '../types/paper';
import { useUpdatePaper } from '../hooks/usePapers';

interface PaperCardProps {
  paper: Paper;
  onClick: () => void;
  isSelected?: boolean;
}

export function PaperCard({ paper, onClick, isSelected }: PaperCardProps) {
  const updatePaper = useUpdatePaper();

  const addedDate = paper.created_at
    ? new Date(paper.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  function truncateAuthors(authors: string, max = 3): string {
    const list = authors.split(', ');
    if (list.length <= max) return authors;
    return list.slice(0, max).join(', ') + ' et al.';
  }

  function handleToggleRead(e: React.MouseEvent) {
    e.stopPropagation();
    if (paper.id) {
      updatePaper.mutate({ id: paper.id, updates: { read_status: !paper.read_status } });
    }
  }

  return (
    <div
      onClick={onClick}
      className={`group bg-white border rounded-xl p-5 cursor-pointer hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/50 transition-all duration-200 ${
        isSelected
          ? 'border-indigo-400 ring-2 ring-indigo-400/30 shadow-lg shadow-indigo-100/50'
          : 'border-gray-200/60'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-[15px] font-medium text-gray-900 line-clamp-2 flex-1 leading-snug group-hover:text-indigo-900 transition-colors">
          {paper.title}
        </h3>
        <button
          onClick={handleToggleRead}
          className={`shrink-0 px-2.5 py-1 text-xs font-medium rounded-full transition-all hover:scale-105 ${
            paper.read_status
              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              : 'bg-gray-100 text-gray-500 hover:bg-indigo-100 hover:text-indigo-600'
          }`}
        >
          {paper.read_status ? 'read' : 'unread'}
        </button>
      </div>

      <p className="text-sm text-gray-500 line-clamp-1 mb-4">
        {truncateAuthors(paper.authors)}
      </p>

      <div className="flex items-center justify-end text-xs text-gray-400">
        {addedDate && <span>Added {addedDate}</span>}
      </div>
    </div>
  );
}
