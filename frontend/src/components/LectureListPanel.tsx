import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SavedLecture } from '../types';
import { useAppContext } from '../context/AppContext';
import AgentJobStatusBar from './AgentJobStatusBar';
import CourseFolderLabel from './CourseFolderLabel';
import { displayCourseColor } from '../constants/courseColors';

interface LectureListPanelProps {
  onSelect?: (lecture: SavedLecture) => void;
}

const LectureListPanel: React.FC<LectureListPanelProps> = ({ onSelect }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { lectures, deleteLecture, activeCourseId, setActiveCourseId, courses, isLoadingLectures } = useAppContext();
  const [query, setQuery] = useState('');

  const currentId = location.pathname.startsWith('/lecture/')
    ? location.pathname.split('/lecture/')[1]
    : undefined;

  const filtered = useMemo(() => {
    let list = lectures;
    if (activeCourseId) {
      list = list.filter(l => l.courseId === activeCourseId);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(l => l.title.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [lectures, activeCourseId, query]);

  const activeCourse = courses.find(c => c.id === activeCourseId);

  const handleSelect = (lecture: SavedLecture) => {
    navigate(`/lecture/${lecture.id}`);
    onSelect?.(lecture);
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <aside className="w-64 md:w-72 bg-white border-r border-stone-200 flex flex-col shrink-0 h-full">
      <AgentJobStatusBar />
      <header className="p-4 border-b border-stone-100 space-y-2">
        <select
          value={activeCourseId ?? ''}
          onChange={e => setActiveCourseId(e.target.value ? e.target.value : null)}
          className="lg:hidden w-full text-sm border border-stone-200 rounded-lg px-3 py-2 bg-stone-50"
          aria-label="Filter by course"
        >
          <option value="">All lectures</option>
          {courses.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <div className="hidden lg:block rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-2.5">
          {activeCourse ? (
            <CourseFolderLabel
              name={activeCourse.name}
              color={displayCourseColor(activeCourse.color)}
              subtitle={`${filtered.length} lecture${filtered.length !== 1 ? 's' : ''} in this folder`}
              size="sm"
            />
          ) : (
            <CourseFolderLabel
              name="All lectures"
              color="#92400e"
              subtitle={`${filtered.length} across every course`}
              size="sm"
            />
          )}
        </div>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search lectures…"
          className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-800/20"
        />
      </header>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {isLoadingLectures && (
          <p className="text-sm text-stone-400 text-center py-8">Loading…</p>
        )}
        {!isLoadingLectures && filtered.length === 0 && (
          <p className="text-sm text-stone-400 text-center py-8 px-2">
            {query ? 'No matches.' : 'No lectures yet. Start a capture from your study desk.'}
          </p>
        )}
        {filtered.map(lecture => {
          const active = currentId === lecture.id;
          const accent = activeCourse ? displayCourseColor(activeCourse.color) : '#92400e';
          return (
            <div
              key={lecture.id}
              className={`group relative rounded-xl transition-colors border-l-4 ${
                active ? 'bg-amber-50/80' : 'hover:bg-stone-50 border-transparent'
              }`}
              style={active ? { borderLeftColor: accent } : undefined}
            >
              <button
                type="button"
                onClick={() => handleSelect(lecture)}
                className="w-full text-left p-3 pr-8"
              >
                <p className={`text-sm truncate ${active ? 'font-semibold text-stone-900' : 'font-medium text-stone-800'}`}>
                  {lecture.title}
                </p>
                <p className="text-xs text-stone-500 mt-0.5">{formatDate(lecture.date)}</p>
              </button>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  if (confirm('Delete this lecture?')) deleteLecture(lecture.id);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          );
        })}
      </nav>
    </aside>
  );
};

export default LectureListPanel;
