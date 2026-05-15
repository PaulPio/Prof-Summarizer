import React, { useState, useEffect } from 'react';
import { SavedLecture } from '../types';
import { NotionService, NotionExportResult } from '../services/notionService';
import { useAppContext } from '../context/AppContext';

interface NotionExportModalProps {
  lecture: SavedLecture;
  onClose: () => void;
}

const NotionExportModal: React.FC<NotionExportModalProps> = ({ lecture, onClose }) => {
  const { userSettings } = useAppContext();
  const [pages, setPages] = useState<{ id: string; title: string }[]>([]);
  const [selectedPageId, setSelectedPageId] = useState(userSettings?.notionDefaultPageId || '');
  const [exportCornell, setExportCornell] = useState(!!lecture.cornellNotes);
  const [exportFlashcards, setExportFlashcards] = useState(!!lecture.flashcards?.length);
  const [exportSummary, setExportSummary] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [results, setResults] = useState<NotionExportResult[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    NotionService.getPages()
      .then(data => {
        setPages(data);
        if (data.length > 0 && !selectedPageId) setSelectedPageId(data[0].id);
      })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  const handleExport = async () => {
    if (!selectedPageId) return;
    setIsExporting(true);
    setError('');
    const newResults: NotionExportResult[] = [];

    try {
      if (exportCornell && lecture.cornellNotes) {
        const r = await NotionService.exportCornellNotes(lecture.title, lecture.cornellNotes, selectedPageId);
        newResults.push(r);
      }
      if (exportFlashcards && lecture.flashcards?.length) {
        const r = await NotionService.exportFlashcardsDatabase(lecture.title, lecture.flashcards, selectedPageId);
        newResults.push(r);
      }
      if (exportSummary) {
        const r = await NotionService.exportSummary(lecture.title, lecture.summary, selectedPageId);
        newResults.push(r);
      }
      setResults(newResults);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-black text-gray-900">Export to Notion</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

          {results.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-bold text-green-700">Exported successfully!</p>
              {results.map((r, i) => (
                <a key={i} href={r.pageUrl} target="_blank" rel="noopener noreferrer" className="block p-3 bg-gray-50 rounded-xl border hover:bg-gray-100 transition-colors text-sm text-blue-600 font-medium truncate">
                  {r.pageUrl}
                </a>
              ))}
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Export to page</label>
                {isLoading ? (
                  <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
                ) : (
                  <select
                    value={selectedPageId}
                    onChange={e => setSelectedPageId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {pages.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Content to export</label>
                <div className="space-y-2">
                  {lecture.cornellNotes && (
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={exportCornell} onChange={e => setExportCornell(e.target.checked)} className="rounded" />
                      <span className="text-sm text-gray-700">Cornell Notes</span>
                    </label>
                  )}
                  {lecture.flashcards?.length ? (
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={exportFlashcards} onChange={e => setExportFlashcards(e.target.checked)} className="rounded" />
                      <span className="text-sm text-gray-700">Flashcards ({lecture.flashcards.length} cards)</span>
                    </label>
                  ) : null}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={exportSummary} onChange={e => setExportSummary(e.target.checked)} className="rounded" />
                    <span className="text-sm text-gray-700">Classic Summary</span>
                  </label>
                </div>
              </div>

              <button
                onClick={handleExport}
                disabled={isExporting || (!exportCornell && !exportFlashcards && !exportSummary) || !selectedPageId}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black disabled:opacity-50 transition-colors"
              >
                {isExporting ? 'Exporting…' : 'Export to Notion'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotionExportModal;
