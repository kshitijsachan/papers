import { useState, useEffect, useRef, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/Header';
import type { HeaderHandle } from './components/Header';
import { PaperGrid } from './components/PaperGrid';
import type { PaperGridHandle } from './components/PaperGrid';
import { PaperDetail } from './components/PaperDetail';
import { SyncIndicator } from './components/SyncIndicator';
import { useUpdatePaper } from './hooks/usePapers';
import type { Paper } from './types/paper';

const queryClient = new QueryClient();

function AppContent() {
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const headerRef = useRef<HeaderHandle>(null);
  const gridRef = useRef<PaperGridHandle>(null);

  const updatePaper = useUpdatePaper();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if (e.key === 'Escape') {
        if (showShortcuts) {
          setShowShortcuts(false);
        } else if (selectedPaper) {
          setSelectedPaper(null);
        } else if (isInputFocused) {
          (target as HTMLInputElement).blur();
        }
        setSelectedIndex(-1);
        return;
      }

      if (isInputFocused) return;

      const papers = gridRef.current?.getFilteredPapers() || [];

      switch (e.key) {
        case '/':
          e.preventDefault();
          headerRef.current?.focusSearch();
          break;
        case 'f':
          e.preventDefault();
          gridRef.current?.focusFilter();
          break;
        case 'j':
          e.preventDefault();
          if (papers.length > 0) {
            setSelectedIndex((prev) =>
              prev < papers.length - 1 ? prev + 1 : prev
            );
          }
          break;
        case 'k':
          e.preventDefault();
          if (papers.length > 0) {
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          }
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < papers.length) {
            setSelectedPaper(papers[selectedIndex]);
          }
          break;
        case 'r':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < papers.length) {
            const paper = papers[selectedIndex];
            if (paper.id) {
              updatePaper.mutate({
                id: paper.id,
                updates: { read_status: !paper.read_status },
              });
            }
          }
          break;
        case '?':
          e.preventDefault();
          setShowShortcuts((prev) => !prev);
          break;
      }
    },
    [selectedPaper, selectedIndex, updatePaper, showShortcuts]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100/50">
      <Header ref={headerRef} />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <PaperGrid
          ref={gridRef}
          onSelectPaper={setSelectedPaper}
          selectedIndex={selectedIndex}
        />
      </main>

      {selectedPaper && (
        <PaperDetail key={selectedPaper.id} paper={selectedPaper} onClose={() => setSelectedPaper(null)} />
      )}

      <div className="fixed bottom-4 right-4 flex items-center gap-3">
        <SyncIndicator />
        <button
          onClick={() => setShowShortcuts((prev) => !prev)}
          className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-white/80 border border-gray-200 rounded-lg hover:bg-white hover:text-gray-700 transition-all shadow-sm backdrop-blur-sm"
        >
          <span className="font-mono">?</span> Shortcuts
        </button>
      </div>

      {showShortcuts && (
        <div className="fixed inset-0 z-30 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setShowShortcuts(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              Keyboard Shortcuts
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Focus arXiv search</span>
                <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">/</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Focus library filter</span>
                <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">f</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Next paper</span>
                <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">j</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Previous paper</span>
                <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">k</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Open selected paper</span>
                <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">Enter</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Toggle read status</span>
                <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">r</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Close modal / blur</span>
                <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">Esc</kbd>
              </div>
            </div>
            <button
              onClick={() => setShowShortcuts(false)}
              className="mt-5 w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
