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
  const [createHubPage, setCreateHubPage] = useState(false);
  const [hubPageTitle, setHubPageTitle] = useState(`${lecture.title} — Lecture`);
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
        setSelectedPageId(prev =>
          prev || userSettings?.notionDefaultPageId || data[0]?.id || '',
        );
      })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [userSettings?.notionDefaultPageId]);

  const handleExport = async () => {
    if (!selectedPageId) return;
    const hubTrim = hubPageTitle.trim();
    if (createHubPage && !hubTrim) return;

    setIsExporting(true);
    setError('');
    const newResults: NotionExportResult[] = [];

    try {
      let exportIntoId = selectedPageId;
      if (createHubPage) {
        const hub = await NotionService.createChildPage(selectedPageId, hubTrim);
        newResults.push(hub);
        exportIntoId = hub.pageId;
      }

      if (exportCornell && lecture.cornellNotes) {
        const r = await NotionService.exportCornellNotes(lecture.title, lecture.cornellNotes, exportIntoId);
        newResults.push(r);
      }
      if (exportFlashcards && lecture.flashcards?.length) {
        const r = await NotionService.exportFlashcardsDatabase(lecture.title, lecture.flashcards, exportIntoId);
        newResults.push(r);
      }
      if (exportSummary) {
        const r = await NotionService.exportSummary(lecture.title, lecture.summary, exportIntoId);
        newResults.push(r);
      }
      setResults(newResults);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const hasAnyExport = exportCornell || exportFlashcards || exportSummary;
  const hubTitleOk = !createHubPage || hubPageTitle.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b shrink-0">
          <h3 className="text-lg font-black text-gray-900">Export to Notion</h3>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

          {results.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-bold text-green-700">Exported successfully!</p>
              {results.length > 1 && (
                <p className="text-xs text-gray-600">
                  {createHubPage
                    ? 'First link is the new hub page; the rest are the exported sections.'
                    : 'Each link opens a separate page.'}
                </p>
              )}
              {results.map((r, i) => (
                <a key={i} href={r.pageUrl} target="_blank" rel="noopener noreferrer" className="block p-3 bg-gray-50 rounded-xl border hover:bg-gray-100 transition-colors text-sm text-blue-600 font-medium truncate">
                  {r.pageUrl}
                </a>
              ))}
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  {createHubPage ? 'Parent page (new page goes here)' : 'Export under page'}
                </label>
                {isLoading ? (
                  <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
                ) : pages.length === 0 ? (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    No pages found. Share at least one page with your Notion integration, then reopen this modal.
                  </p>
                ) : (
                  <select
                    value={selectedPageId}
                    onChange={e => setSelectedPageId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {pages.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 p-4 space-y-3 bg-gray-50/80">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createHubPage}
                    onChange={e => setCreateHubPage(e.target.checked)}
                    className="rounded mt-0.5"
                  />
                  <span>
                    <span className="text-sm font-bold text-gray-900">Create a new page first</span>
                    <span className="block text-xs text-gray-600 mt-0.5">
                      Like nesting in Notion: we create a blank child page under the page above, then put Cornell notes, summary, and flashcards inside it as sub-pages.
                    </span>
                  </span>
                </label>
                {createHubPage && (
                  <div>
                    <label htmlFor="hub-title" className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                      New page title
                    </label>
                    <input
                      id="hub-title"
                      type="text"
                      value={hubPageTitle}
                      onChange={e => setHubPageTitle(e.target.value)}
                      placeholder="e.g. CS 101 — Week 3"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
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
                type="button"
                onClick={handleExport}
                disabled={
                  isExporting
                  || !hasAnyExport
                  || !selectedPageId
                  || pages.length === 0
                  || !hubTitleOk
                }
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
