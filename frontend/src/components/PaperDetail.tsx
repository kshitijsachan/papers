import { useState, useEffect, useRef } from 'react';
import { usePapers, useUpdatePaper, useUpdateNotes, useDeletePaper, useFigures, useTags, useAddTagToPaper, useRemoveTagFromPaper, useCreateTag, useDeleteTag } from '../hooks/usePapers';
import { LatexText } from './LatexText';
import { MarkdownLatex } from './MarkdownLatex';
import type { Paper, Figure } from '../types/paper';

interface PaperDetailProps {
  paper: Paper;
  onClose: () => void;
  currentIndex?: number;
  totalPapers?: number;
  onNavigate?: (delta: number) => void;
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
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault();
        e.stopPropagation();
        onNavigate(currentIndex - 1);
      }
      if (e.key === 'ArrowRight' && currentIndex < figures.length - 1) {
        e.preventDefault();
        e.stopPropagation();
        onNavigate(currentIndex + 1);
      }
    }
    // Use capture phase to get events before App.tsx handler
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
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

export function PaperDetail({ paper, onClose, currentIndex, totalPapers, onNavigate }: PaperDetailProps) {
  const hasPrev = currentIndex !== undefined && currentIndex > 0;
  const hasNext = currentIndex !== undefined && totalPapers !== undefined && currentIndex < totalPapers - 1;
  const [notes, setNotes] = useState(paper.notes || '');
  const [experiments, setExperiments] = useState(paper.experiments || '');
  const [selectedFigureIndex, setSelectedFigureIndex] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState<'edit' | 'preview'>('preview');
  const [experimentsMode, setExperimentsMode] = useState<'edit' | 'preview'>('preview');
  const [showTagManager, setShowTagManager] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6366f1');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const experimentsTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Get fresh paper data from query
  const { data: papers } = usePapers();
  const currentPaper = papers?.find(p => p.id === paper.id) || paper;

  const updatePaper = useUpdatePaper();
  const updateNotes = useUpdateNotes();
  const deletePaper = useDeletePaper();
  const { data: allTags } = useTags();
  const addTag = useAddTagToPaper();
  const removeTag = useRemoveTagFromPaper();
  const createTag = useCreateTag();
  const deleteTagMutation = useDeleteTag();

  // Set initial textarea height based on content (only when entering edit mode)
  useEffect(() => {
    if (textareaRef.current && notesMode === 'edit') {
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(600, Math.max(300, scrollHeight)) + 'px';
    }
  }, [notesMode]);

  // Auto-save notes with debounce
  useEffect(() => {
    if (notes === (paper.notes || '')) return;
    const timer = setTimeout(() => {
      if (paper.id) {
        updateNotes.mutate({ id: paper.id, notes, experiments: undefined });
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [notes, paper.id, paper.notes]);

  // Auto-save experiments with debounce
  useEffect(() => {
    if (experiments === (paper.experiments || '')) return;
    const timer = setTimeout(() => {
      if (paper.id) {
        updateNotes.mutate({ id: paper.id, notes: undefined, experiments });
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [experiments, paper.id, paper.experiments]);

  // Save experiments on page unload (e.g., closing tab)
  useEffect(() => {
    function handleBeforeUnload() {
      if (experimentsTextareaRef.current && paper.id) {
        const currentVal = experimentsTextareaRef.current.value;
        if (currentVal !== (paper.experiments || '')) {
          // Use sendBeacon for reliable save on unload
          const data = JSON.stringify({ experiments: currentVal });
          navigator.sendBeacon(
            `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/papers/${paper.id}/notes`,
            new Blob([data], { type: 'application/json' })
          );
        }
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [paper.id, paper.experiments]);

  // Keyboard shortcuts for notes
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;

      // Escape or Cmd+Enter while editing = go to preview (don't close modal)
      if (notesMode === 'edit' && target.tagName === 'TEXTAREA') {
        if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) {
          e.preventDefault();
          e.stopPropagation();
          setNotesMode('preview');
          (target as HTMLTextAreaElement).blur();
          return;
        }
      }

      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      // 'e' to enter edit mode
      if (e.key === 'e') {
        e.preventDefault();
        setNotesMode('edit');
        setTimeout(() => textareaRef.current?.focus(), 0);
      }
    }
    document.addEventListener('keydown', handleKeyDown, true); // capture phase
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [notesMode]);

  const { data: figures, isLoading: figuresLoading } = useFigures(paper.id);

  function handleToggleRead() {
    if (paper.id) {
      updatePaper.mutate({ id: paper.id, updates: { read_status: !currentPaper.read_status } });
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
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onMouseDown={onClose} />

        <div className="relative min-h-full flex items-start justify-center p-4 pt-16" onMouseDown={onClose}>
          <div className="relative bg-white rounded-2xl shadow-2xl shadow-gray-300/50 max-w-6xl w-full max-h-[calc(100vh-8rem)] overflow-y-auto" onMouseDown={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleToggleRead}
                  className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    currentPaper.read_status
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-700'
                  }`}
                >
                  {currentPaper.read_status ? 'Read' : 'Mark as Read'}
                </button>

                <button
                  onClick={() => {
                    if (paper.id) {
                      updatePaper.mutate({ id: paper.id, updates: { starred: !currentPaper.starred } });
                    }
                  }}
                  className={`p-1.5 rounded-lg transition-all ${
                    currentPaper.starred
                      ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                      : 'text-gray-400 bg-gray-100 hover:text-amber-500 hover:bg-amber-50'
                  }`}
                  title={currentPaper.starred ? 'Unstar paper' : 'Star paper'}
                >
                  <svg className="w-4 h-4" fill={currentPaper.starred ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </button>

                {/* Navigation */}
                {totalPapers !== undefined && totalPapers > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onNavigate?.(-1)}
                      disabled={!hasPrev}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Previous paper (←)"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="text-xs text-gray-400 min-w-[3rem] text-center">
                      {(currentIndex ?? 0) + 1} / {totalPapers}
                    </span>
                    <button
                      onClick={() => onNavigate?.(1)}
                      disabled={!hasNext}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Next paper (→)"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

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

              {/* Tags */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-800">Tags</h3>
                  <button
                    onClick={() => setShowTagManager(!showTagManager)}
                    className="text-xs text-gray-500 hover:text-indigo-600"
                  >
                    {showTagManager ? 'Done' : 'Manage'}
                  </button>
                </div>

                {showTagManager && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        placeholder="New tag name"
                        className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded"
                      />
                      <input
                        type="color"
                        value={newTagColor}
                        onChange={(e) => setNewTagColor(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer"
                      />
                      <button
                        onClick={() => {
                          if (newTagName.trim()) {
                            createTag.mutate({ name: newTagName.trim(), color: newTagColor });
                            setNewTagName('');
                          }
                        }}
                        className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700"
                      >
                        Add
                      </button>
                    </div>
                    {allTags && allTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-2 border-t border-gray-200">
                        {allTags.map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full"
                            style={{ backgroundColor: tag.color + '20', color: tag.color }}
                          >
                            {tag.name}
                            <button
                              onClick={() => deleteTagMutation.mutate(tag.id)}
                              className="hover:opacity-70"
                              title="Delete tag"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {currentPaper.tags?.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full"
                      style={{
                        backgroundColor: tag.color + '20',
                        color: tag.color,
                      }}
                    >
                      {tag.name}
                      <button
                        onClick={() => currentPaper.id && removeTag.mutate({ paperId: currentPaper.id, tagId: tag.id })}
                        className="ml-0.5 p-0.5 hover:bg-black/10 rounded-full transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                  {allTags?.filter((t) => !currentPaper.tags?.some((pt) => pt.id === t.id)).map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => currentPaper.id && addTag.mutate({ paperId: currentPaper.id, tagId: tag.id })}
                      className="px-2.5 py-1 text-xs font-medium rounded-full border-2 border-dashed opacity-50 hover:opacity-100 transition-opacity"
                      style={{
                        borderColor: tag.color,
                        color: tag.color,
                      }}
                    >
                      + {tag.name}
                    </button>
                  ))}
                  {(!allTags || allTags.length === 0) && (!currentPaper.tags || currentPaper.tags.length === 0) && (
                    <p className="text-sm text-gray-400 italic">No tags yet. Click Manage to create tags.</p>
                  )}
                </div>
              </div>

              {/* Abstract */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Abstract</h3>
                {paper.abstract ? (
                  <p className="text-sm text-gray-600 leading-relaxed">
                    <LatexText>{paper.abstract}</LatexText>
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
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-800">Notes</h3>
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setNotesMode('edit')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                        notesMode === 'edit' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setNotesMode('preview')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                        notesMode === 'preview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Preview
                    </button>
                  </div>
                </div>

                {notesMode === 'edit' ? (
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add your notes here... (supports Markdown and LaTeX with $ and $$)"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 resize-y font-mono"
                    />
                    {updateNotes.isPending && (
                      <span className="absolute bottom-2 right-2 text-xs text-gray-400">Saving...</span>
                    )}
                  </div>
                ) : (
                  <div className="w-full min-h-[8rem] px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50/50">
                    {notes ? (
                      <MarkdownLatex className="text-gray-700 leading-relaxed">{notes}</MarkdownLatex>
                    ) : (
                      <p className="text-gray-400 italic">No notes yet. Click Edit to add notes.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Experiment Ideas */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-800">🧪 Experiment Ideas</h3>
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setExperimentsMode('edit')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                        experimentsMode === 'edit' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        // Save current value before switching to preview
                        if (experimentsTextareaRef.current) {
                          const newVal = experimentsTextareaRef.current.value;
                          if (newVal !== experiments) {
                            setExperiments(newVal);
                          }
                        }
                        setExperimentsMode('preview');
                      }}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                        experimentsMode === 'preview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Preview
                    </button>
                  </div>
                </div>

                {experimentsMode === 'edit' ? (
                  <div className="relative">
                    <textarea
                      ref={experimentsTextareaRef}
                      defaultValue={experiments}
                      onBlur={(e) => {
                        const newVal = e.target.value;
                        if (newVal !== experiments) {
                          setExperiments(newVal);
                        }
                      }}
                      placeholder="What experiments does this paper suggest? What would you try next?"
                      className="w-full min-h-[150px] px-3 py-2.5 text-sm border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-300 resize-none overflow-hidden transition-all font-mono bg-amber-50/30"
                    />
                    {updateNotes.isPending && (
                      <span className="absolute bottom-2 right-2 text-xs text-gray-400">Saving...</span>
                    )}
                  </div>
                ) : (
                  <div className="w-full min-h-[6rem] px-3 py-2.5 text-sm border border-amber-200 rounded-xl bg-amber-50/30">
                    {experiments ? (
                      <MarkdownLatex className="text-gray-700 leading-relaxed">{experiments}</MarkdownLatex>
                    ) : (
                      <p className="text-gray-400 italic">What experiments does this paper suggest?</p>
                    )}
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
