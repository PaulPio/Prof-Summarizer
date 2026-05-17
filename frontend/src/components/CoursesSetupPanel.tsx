import React, { useCallback, useRef, useState } from 'react';
import { Course } from '../types';
import { StorageService } from '../services/storageService';
import { COURSE_COLORS } from '../constants/courseColors';
import CourseManager from './CourseManager';
import {
  MAX_SCHEDULE_IMPORT_BYTES,
  MIN_SCHEDULE_TEXT_CHARS,
  dedupePreservingOrder,
  extractTextFromPdfFile,
  normalizeComparisonKey,
  parseIcsEventSummaries,
  suggestClassNamesFromPdfText,
} from '../utils/scheduleImport';

function existingCourseKeySet(courses: Course[]): Set<string> {
  return new Set(courses.map(c => normalizeComparisonKey(c.name)));
}

interface CoursesSetupPanelProps {
  userId: string;
  courses: Course[];
  compact?: boolean;
  onCoursesChanged: () => Promise<void>;
}

const CoursesSetupPanel: React.FC<CoursesSetupPanelProps> = ({
  userId,
  courses,
  compact,
  onCoursesChanged,
}) => {
  const [pasteText, setPasteText] = useState('');
  const [busyKind, setBusyKind] = useState<'paste' | 'file' | 'syllabus' | null>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [previewRows, setPreviewRows] = useState<string[] | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<Record<number, boolean>>({});
  const [showCourseManager, setShowCourseManager] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [syllabusPickCourseId, setSyllabusPickCourseId] = useState<string | null>(null);
  const syllabusInputRef = useRef<HTMLInputElement>(null);

  const isGuest = userId === 'guest';

  const nextColor = useCallback(() => {
    const i = courses.length % COURSE_COLORS.length;
    return COURSE_COLORS[i];
  }, [courses.length]);

  const syncSelectedWithPreview = useCallback((rows: string[]) => {
    const next: Record<number, boolean> = {};
    rows.forEach((_, i) => {
      next[i] = true;
    });
    setSelectedPreview(next);
  }, []);

  const addBulkLines = async (lines: string[]) => {
    const trimmed = dedupePreservingOrder(lines.filter(l => l.trim()));
    if (trimmed.length === 0) return;
    const keys = existingCourseKeySet(courses);
    let added = 0;
    let skipped = 0;
    setBusyKind('paste');
    try {
      let rotate = courses.length;
      for (const name of trimmed) {
        const key = normalizeComparisonKey(name);
        if (!key || keys.has(key)) {
          skipped++;
          continue;
        }
        keys.add(key);
        const color = COURSE_COLORS[rotate % COURSE_COLORS.length];
        rotate++;
        await StorageService.saveCourse(userId, name, color);
        added++;
      }
      await onCoursesChanged();
      setPasteText('');
      setMsg({
        type: 'ok',
        text: skipped
          ? `Added ${added} course(s). Skipped ${skipped} duplicate(s) already in your list.`
          : `Added ${added} course(s).`,
      });
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Could not save courses.' });
    } finally {
      setBusyKind(null);
    }
  };

  const handlePasteSubmit = async () => {
    setMsg(null);
    const lines = pasteText.split('\n').map(l => l.trim()).filter(Boolean);
    await addBulkLines(lines);
  };

  const onDropZone = async (files: FileList | null) => {
    setMsg(null);
    if (!files?.length) return;
    const file = files[0];
    if (file.size > MAX_SCHEDULE_IMPORT_BYTES) {
      setMsg({ type: 'err', text: 'File too large (max 5 MB). Try a shorter export.' });
      return;
    }

    const name = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf');
    const isIcs = file.type.includes('calendar') || name.endsWith('.ics') || name.endsWith('.ical');

    setBusyKind('file');
    try {
      if (isIcs) {
        const text = await file.text();
        const sums = dedupePreservingOrder(parseIcsEventSummaries(text));
        if (sums.length === 0) {
          setMsg({
            type: 'err',
            text: 'No event titles found. Export a calendar (.ics) that includes SUMMARY lines, or add classes manually.',
          });
          setPreviewRows(null);
          return;
        }
        setPreviewRows(sums);
        syncSelectedWithPreview(sums);
      } else if (isPdf) {
        const raw = await extractTextFromPdfFile(file);
        if (raw.length < MIN_SCHEDULE_TEXT_CHARS) {
          setMsg({
            type: 'err',
            text:
              'Could not read enough text from this PDF. It may be a scanned/image schedule. Try a digital PDF, export your calendar (.ics), or type your courses below.',
          });
          setPreviewRows(null);
          return;
        }
        const rows = dedupePreservingOrder(suggestClassNamesFromPdfText(raw));
        if (rows.length === 0) {
          setMsg({
            type: 'err',
            text: 'Could not infer class names from this PDF. Adjust manually with paste below, or try a calendar export (.ics).',
          });
          setPreviewRows(null);
          return;
        }
        setPreviewRows(rows);
        syncSelectedWithPreview(rows);
        setMsg({ type: 'ok', text: 'Review suggestions below — uncheck extras, edit later in this list.' });
      } else {
        setMsg({ type: 'err', text: 'Use an .ics calendar export or a schedule PDF.' });
      }
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Failed to read schedule file.' });
      setPreviewRows(null);
    } finally {
      setBusyKind(null);
    }
  };

  const togglePreviewRow = (index: number) => {
    setSelectedPreview(prev => {
      const prior = prev[index];
      const wasChecked = prior !== false;
      return { ...prev, [index]: !wasChecked };
    });
  };

  const selectAllPreview = (on: boolean) => {
    if (!previewRows) return;
    const next: Record<number, boolean> = {};
    previewRows.forEach((_, i) => {
      next[i] = on;
    });
    setSelectedPreview(next);
  };

  const confirmPreview = async () => {
    if (!previewRows) return;
    const chosen = previewRows.filter((_, i) => selectedPreview[i] !== false);
    if (chosen.length === 0) {
      setMsg({ type: 'err', text: 'Select at least one course to import.' });
      return;
    }
    setPreviewRows(null);
    setSelectedPreview({});
    await addBulkLines(chosen);
  };

  const openSyllabusPicker = (courseId: string) => {
    setSyllabusPickCourseId(courseId);
    syllabusInputRef.current?.click();
  };

  const onSyllabusFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const cid = syllabusPickCourseId;
    setSyllabusPickCourseId(null);
    if (!file || !cid) return;

    const course = courses.find(c => c.id === cid);
    if (!course || isGuest) return;

    if (file.size > 25 * 1024 * 1024) {
      setMsg({ type: 'err', text: 'Syllabus file too large (max 25 MB).' });
      return;
    }

    setBusyKind('syllabus');
    try {
      await StorageService.uploadCourseSyllabus(userId, course, file);
      await onCoursesChanged();
      setMsg({ type: 'ok', text: 'Syllabus saved. Only you can access it.' });
    } catch (err) {
      setMsg({ type: 'err', text: err instanceof Error ? err.message : 'Upload failed.' });
    } finally {
      setBusyKind(null);
    }
  };

  const removeSyllabus = async (course: Course) => {
    if (isGuest) return;
    setBusyKind('syllabus');
    try {
      await StorageService.removeCourseSyllabus(userId, course);
      await onCoursesChanged();
      setMsg({ type: 'ok', text: 'Syllabus removed.' });
    } catch (err) {
      setMsg({ type: 'err', text: err instanceof Error ? err.message : 'Could not remove file.' });
    } finally {
      setBusyKind(null);
    }
  };

  const handleDeleteCourse = async (course: Course) => {
    if (!confirm(`Remove “${course.name}” from your list? Lectures stay in “Uncategorized”.`)) return;
    await StorageService.deleteCourse(userId, course.id);
    await onCoursesChanged();
  };

  const handleCreateCourse = async (name: string, color: string) => {
    await StorageService.saveCourse(userId, name, color);
    await onCoursesChanged();
    setShowCourseManager(false);
  };

  const handleEditCourse = async (name: string, color: string) => {
    if (!editingCourse) return;
    await StorageService.updateCourse(userId, editingCourse.id, { name, color });
    await onCoursesChanged();
    setEditingCourse(null);
  };

  return (
    <div className="space-y-6">
      <div className="text-center md:text-left">
        <p className="text-sm font-bold text-gray-900">Courses / classes</p>
        <p className="text-xs text-gray-500 mt-1">
          Add courses you want Auto-Organizer to choose from (CS 101, Bio 212, …). Import from a{' '}
          <strong>.ics calendar</strong> or a <strong>schedule PDF</strong>, or paste one per line.
        </p>
        {!compact && (
          <p className="text-xs text-gray-400 mt-1">
            Signed-in syllabi attach to Storage in your folder only—not shared.
          </p>
        )}
      </div>

      {msg && (
        <div
          className={`p-3 rounded-xl text-sm ${
            msg.type === 'ok' ? 'bg-green-50 text-green-800 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
          }`}
        >
          {msg.text}
        </div>
      )}

      <div
        className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-blue-300 transition-colors bg-gray-50/80"
        onDragOver={e => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={e => {
          e.preventDefault();
          void onDropZone(e.dataTransfer.files);
        }}
      >
        <p className="text-sm font-bold text-gray-800">Drop calendar or PDF</p>
        <p className="text-xs text-gray-500 mt-1 mb-4">Accepted: .ics, .pdf (max 5 MB)</p>
        <label className="inline-flex items-center justify-center px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 cursor-pointer hover:bg-gray-50 shadow-sm">
          Choose file…
          <input
            type="file"
            accept=".ics,.pdf,application/pdf,text/calendar"
            className="hidden"
            disabled={busyKind === 'file'}
            onChange={e => void onDropZone(e.target.files)}
          />
        </label>
      </div>

      {previewRows && previewRows.length > 0 && (
        <div className="border border-blue-100 bg-blue-50/40 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <p className="text-sm font-bold text-gray-900">{previewRows.length} suggestion(s)</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => selectAllPreview(true)}
                className="text-xs font-bold text-blue-700 underline"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => selectAllPreview(false)}
                className="text-xs font-bold text-gray-600 underline"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
            {previewRows.map((title, index) => (
              <label key={`${title}-${index}`} className="flex items-start gap-2 text-sm cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={selectedPreview[index] !== false}
                  onChange={() => togglePreviewRow(index)}
                  className="mt-0.5 rounded"
                />
                <span className="text-gray-800">{title}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              disabled={busyKind === 'paste'}
              onClick={() => void confirmPreview()}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 disabled:opacity-40"
            >
              {busyKind === 'paste' ? 'Saving…' : 'Add checked courses'}
            </button>
            <button
              type="button"
              onClick={() => {
                setPreviewRows(null);
                setSelectedPreview({});
              }}
              className="px-4 py-2.5 rounded-xl border text-xs font-bold text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Paste one class per line</label>
        <textarea
          value={pasteText}
          onChange={e => setPasteText(e.target.value)}
          rows={compact ? 3 : 4}
          placeholder="CS 3310 Algorithms&#10;BIO 1201 Cellular Biology&#10;"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
        />
        <button
          type="button"
          disabled={!pasteText.trim() || busyKind === 'paste'}
          onClick={() => void handlePasteSubmit()}
          className="mt-3 w-full py-2.5 bg-gray-900 text-white rounded-xl text-xs font-black hover:bg-black disabled:opacity-40 transition-colors"
        >
          {busyKind === 'paste' ? 'Adding…' : 'Add from text'}
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider">Your courses</h3>
        <button type="button" onClick={() => setShowCourseManager(true)} className="text-xs font-black text-blue-600 hover:text-blue-800">
          + New course
        </button>
      </div>

      {courses.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">None yet — import or paste above.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white">
          {courses.map(c => (
            <li key={c.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                <span className="font-bold text-gray-900 truncate">{c.name}</span>
              </div>
              {!isGuest && (
                <div className="text-xs text-gray-500 flex-1">
                  {c.syllabusFileName ? (
                    <span>Syllabus: {c.syllabusFileName}</span>
                  ) : (
                    <span className="text-gray-400">No syllabus yet</span>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {!isGuest && (
                  <>
                    <button
                      type="button"
                      onClick={() => openSyllabusPicker(c.id)}
                      disabled={busyKind === 'syllabus'}
                      className="text-xs font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 disabled:opacity-40"
                    >
                      {c.syllabusFilePath ? 'Replace syllabus' : 'Attach syllabus'}
                    </button>
                    {c.syllabusFilePath && (
                      <button
                        type="button"
                        onClick={() => void removeSyllabus(c)}
                        className="text-xs font-bold px-2 py-1 rounded-lg bg-gray-50 text-gray-600 border hover:bg-gray-100"
                      >
                        Remove file
                      </button>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setEditingCourse(c)}
                  className="text-xs font-bold px-2 py-1 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteCourse(c)}
                  className="text-xs font-bold px-2 py-1 rounded-lg border border-red-100 text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={syllabusInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={e => void onSyllabusFile(e)}
      />

      {showCourseManager && (
        <CourseManager mode="create" initialColor={nextColor()} onSave={handleCreateCourse} onCancel={() => setShowCourseManager(false)} />
      )}
      {editingCourse && (
        <CourseManager
          mode="edit"
          initialName={editingCourse.name}
          initialColor={editingCourse.color}
          onSave={handleEditCourse}
          onCancel={() => setEditingCourse(null)}
        />
      )}
    </div>
  );
};

export default CoursesSetupPanel;
