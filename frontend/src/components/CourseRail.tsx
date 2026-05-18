import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import CourseManager from './CourseManager';
import { StorageService } from '../services/storageService';
import { displayCourseColor } from '../constants/courseColors';

const CourseRail: React.FC = () => {
  const { user, courses, setCourses, lectures, activeCourseId, setActiveCourseId } = useAppContext();
  const [showCreate, setShowCreate] = useState(false);

  const lectureCount = (courseId: string | null) => {
    if (courseId === null) return lectures.length;
    if (courseId === '') return lectures.filter(l => !l.courseId).length;
    return lectures.filter(l => l.courseId === courseId).length;
  };

  const handleCreate = async (name: string, color: string) => {
    if (!user) return;
    try {
      const course = await StorageService.saveCourse(user.id, name, color);
      setCourses(prev => [...prev, course]);
      setActiveCourseId(course.id);
    } catch (err) {
      console.error('Failed to create course:', err);
    }
    setShowCreate(false);
  };

  return (
    <aside className="w-56 bg-stone-100/60 border-r border-stone-200 p-4 hidden lg:flex flex-col shrink-0">
      <header className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Courses</p>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="p-1 rounded-md hover:bg-white text-stone-500 hover:text-amber-800"
          title="Add course"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </header>

      <nav className="space-y-2 flex-1 overflow-y-auto">
        <button
          type="button"
          onClick={() => setActiveCourseId(null)}
          className={`w-full text-left p-3 rounded-xl transition-colors ${
            activeCourseId === null
              ? 'bg-white border border-amber-200 shadow-sm'
              : 'hover:bg-white/80'
          }`}
        >
          <span className={`w-full h-1 rounded-full block mb-2 ${activeCourseId === null ? 'bg-amber-800' : 'bg-stone-300'}`} />
          <p className={`font-serif leading-tight ${activeCourseId === null ? 'text-base text-stone-900' : 'text-sm text-stone-700'}`}>
            All lectures
          </p>
          <p className="text-xs text-stone-500">{lectureCount(null)} total</p>
        </button>

        {courses.map(course => {
          const active = activeCourseId === course.id;
          const count = lectureCount(course.id);
          const accent = displayCourseColor(course.color);
          return (
            <button
              key={course.id}
              type="button"
              onClick={() => setActiveCourseId(course.id)}
              className={`w-full text-left p-3 rounded-xl transition-colors border-l-4 ${
                active ? 'bg-white border border-stone-200 shadow-sm' : 'hover:bg-white/80 border-transparent'
              }`}
              style={active ? { borderLeftColor: accent } : undefined}
            >
              <span
                className="w-full h-1 rounded-full block mb-2"
                style={{ backgroundColor: accent }}
              />
              <p className={`font-serif leading-tight truncate ${active ? 'text-base text-stone-900' : 'text-sm text-stone-700'}`}>
                {course.name}
              </p>
              <p className="text-xs text-stone-500">
                {count} lecture{count !== 1 ? 's' : ''}
              </p>
            </button>
          );
        })}
      </nav>

      {showCreate && (
        <CourseManager mode="create" onSave={handleCreate} onCancel={() => setShowCreate(false)} />
      )}
    </aside>
  );
};

export default CourseRail;
