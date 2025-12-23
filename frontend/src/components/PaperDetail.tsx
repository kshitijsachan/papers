import { useState, useEffect } from 'react';
import { useUpdatePaper, useUpdateNotes, useDeletePaper, useFigures } from '../hooks/usePapers';
import { LatexText } from './LatexText';
import type { Paper, Figure } from '../types/paper';

interface PaperDetailProps {
  paper: Paper;
  onClose: () => void;
}

interface FigureLightboxProps {
  figure: Figure;
  figures: Figure[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

function FigureLightbox({ figure, figures, currentIndex, onClose, onNavigate }: FigureLightboxProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(currentIndex - 1);
      if (e.key === 'ArrowRight' && currentIndex < figures.length - 1) onNavigate(currentIndex + 1);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNavigate, currentIndex, figures.length]);

  // Resolve image URL (backend serves from /figures/...)
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const imageUrl = figure.image_url.startsWith('/')
    ? `${apiBase}${figure.image_url}`
    : figure.image_url;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < figures.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      {/* Left arrow */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex - 1); }}
          className="absolute left-4 p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors z-20"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Right arrow */}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex + 1); }}
          className="absolute right-4 p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors z-20"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      <div className="relative max-w-5xl max-h-[90vh] overflow-auto bg-white rounded-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {currentIndex + 1} / {figures.length}
          </span>
          <button
            onClick={onClose}
            className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <img
          src={imageUrl}
          alt={figure.caption || 'Figure'}
          className="max-w-full h-auto"
        />
        {figure.caption && (
          <p className="mt-4 text-sm text-gray-700 leading-relaxed">
            <LatexText>{figure.caption}</LatexText>
          </p>
        )}
      </div>
    </div>
  );
}

export function PaperDetail({ paper, onClose }: PaperDetailProps) {
  const [notes, setNotes] = useState(paper.notes || '');
  const [selectedFigureIndex, setSelectedFigureIndex] = useState<number | null>(null);
  const hasChanges = notes !== (paper.notes || '');

  const updatePaper = useUpdatePaper();
  const updateNotes = useUpdateNotes();
  const deletePaper = useDeletePaper();
  const { data: figures, isLoading: figuresLoading } = useFigures(paper.id);

  useEffect(() => {
    setNotes(paper.notes || '');
  }, [paper.notes]);

  function handleToggleRead() {
    if (paper.id) {
      updatePaper.mutate({ id: paper.id, updates: { read_status: !paper.read_status } });
    }
  }

  function handleSaveNotes() {
    if (paper.id && hasChanges) {
      updateNotes.mutate({ id: paper.id, content: notes });
    }
  }

  function handleDelete() {
    if (paper.id && confirm('Are you sure you want to delete this paper?')) {
      deletePaper.mutate(paper.id);
      onClose();
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-20 overflow-y-auto">
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

        <div className="relative min-h-full flex items-start justify-center p-4 pt-16" onClick={onClose}>
          <div className="relative bg-white rounded-2xl shadow-2xl shadow-gray-300/50 max-w-2xl w-full max-h-[calc(100vh-8rem)] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <button
                onClick={handleToggleRead}
                className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  paper.read_status
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-700'
                }`}
              >
                {paper.read_status ? 'Read' : 'Mark as Read'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDelete}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Title & Authors */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2 leading-snug">
                  {paper.title}
                </h2>
                <p className="text-sm text-gray-600">
                  {paper.authors}
                </p>
              </div>

              {/* Links */}
              {paper.arxiv_url && (
                <div className="flex items-center gap-4">
                  <a
                    href={paper.arxiv_url.replace('/abs/', '/pdf/') + '.pdf'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Open PDF
                  </a>
                  <a
                    href={paper.arxiv_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-500 hover:text-indigo-600 transition-colors"
                  >
                    arXiv page →
                  </a>
                </div>
              )}

              {/* Abstract */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Abstract</h3>
                {paper.abstract ? (
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {paper.abstract}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No abstract available</p>
                )}
              </div>

              {/* Figures */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Figures</h3>
                {figuresLoading ? (
                  <p className="text-sm text-gray-500">Loading figures...</p>
                ) : figures && figures.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {figures.map((figure, idx) => {
                      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                      const imageUrl = figure.image_url.startsWith('/')
                        ? `${apiBase}${figure.image_url}`
                        : figure.image_url;
                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedFigureIndex(idx)}
                          className="text-left border border-gray-200 rounded-xl overflow-hidden bg-gray-50 hover:border-indigo-300 hover:shadow-md transition-all group"
                        >
                          <div className="aspect-video bg-white flex items-center justify-center overflow-hidden p-2">
                            <img
                              src={imageUrl}
                              alt={figure.caption || `Figure ${idx + 1}`}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                            />
                          </div>
                          {figure.caption && (
                            <p className="p-2 text-xs text-gray-600 line-clamp-2 border-t border-gray-200 bg-white">
                              <LatexText>{figure.caption}</LatexText>
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No figures available on ar5iv</p>
                )}
              </div>

              {/* Notes */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Notes</h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add your notes here..."
                  className="w-full h-32 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 resize-y transition-all"
                />
                {hasChanges && (
                  <div className="flex items-center justify-end gap-3 mt-2">
                    <button
                      onClick={() => setNotes(paper.notes || '')}
                      className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Discard
                    </button>
                    <button
                      onClick={handleSaveNotes}
                      disabled={updateNotes.isPending}
                      className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {updateNotes.isPending ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedFigureIndex !== null && figures && figures[selectedFigureIndex] && (
        <FigureLightbox
          figure={figures[selectedFigureIndex]}
          figures={figures}
          currentIndex={selectedFigureIndex}
          onClose={() => setSelectedFigureIndex(null)}
          onNavigate={setSelectedFigureIndex}
        />
      )}
    </>
  );
}
