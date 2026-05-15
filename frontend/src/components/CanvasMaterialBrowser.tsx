import React, { useState, useEffect } from 'react';
import { CanvasService, CanvasCourse, CanvasFile } from '../services/canvasService';
import { StorageService } from '../services/storageService';
import { useAppContext } from '../context/AppContext';

interface CanvasMaterialBrowserProps {
  onImport: (files: CanvasFile[]) => void;
  onClose: () => void;
  filterCourseId?: string;
}

const CanvasMaterialBrowser: React.FC<CanvasMaterialBrowserProps> = ({ onImport, onClose, filterCourseId }) => {
  const { user } = useAppContext();
  const [courses, setCourses] = useState<CanvasCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState(filterCourseId || '');
  const [files, setFiles] = useState<CanvasFile[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    CanvasService.getCourses()
      .then(data => {
        setCourses(data);
        if (data.length > 0 && !filterCourseId) setSelectedCourseId(data[0].id);
      })
      .catch(err => setError(err.message))
      .finally(() => setIsLoadingCourses(false));
  }, []);

  useEffect(() => {
    if (!selectedCourseId) return;
    setIsLoadingFiles(true);
    setFiles([]);
    setSelectedFileIds(new Set());
    CanvasService.getCourseFiles(selectedCourseId)
      .then(setFiles)
      .catch(err => setError(err.message))
      .finally(() => setIsLoadingFiles(false));
  }, [selectedCourseId]);

  const toggleFile = (id: string) => {
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleImport = async () => {
    const selected = files.filter(f => selectedFileIds.has(f.id));
    if (user && user.id !== 'guest') {
      for (const f of selected) {
        try {
          await StorageService.saveCanvasMaterial(user.id, {
            courseId: selectedCourseId,
            canvasFileId: f.id,
            name: f.name,
            mimeType: f.mimeType,
          });
        } catch (err) {
          console.error('Failed to save canvas material:', err);
        }
      }
    }
    onImport(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-black text-gray-900">Canvas Materials</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {error && <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          {isLoadingCourses ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Course</label>
                <select
                  value={selectedCourseId}
                  onChange={e => setSelectedCourseId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {isLoadingFiles ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : files.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">No files found in this course.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Files</p>
                  {files.map(f => (
                    <button
                      key={f.id}
                      onClick={() => toggleFile(f.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${selectedFileIds.has(f.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${selectedFileIds.has(f.id) ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                        {selectedFileIds.has(f.id) && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{f.name}</p>
                        <p className="text-xs text-gray-400">{f.mimeType}{f.size ? ` • ${(f.size / 1024 / 1024).toFixed(1)} MB` : ''}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button
            onClick={handleImport}
            disabled={selectedFileIds.size === 0}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            Import {selectedFileIds.size > 0 ? `(${selectedFileIds.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CanvasMaterialBrowser;
