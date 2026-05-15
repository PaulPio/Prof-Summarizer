import React, { useState } from 'react';
import { SavedLecture, Course } from '../types';
import { StorageService } from '../services/storageService';
import { useAppContext } from '../context/AppContext';
import CourseManager from './CourseManager';
import AgentJobStatusBar from './AgentJobStatusBar';

interface HistorySidebarProps {
  lectures: SavedLecture[];
  onSelect: (lecture: SavedLecture) => void;
  onDelete: (id: string) => void;
  currentId?: string;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ lectures, onSelect, onDelete, currentId }) => {
  const { user, courses, setCourses } = useAppContext();
  const [showCourseManager, setShowCourseManager] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [collapsedCourses, setCollapsedCourses] = useState<Set<string>>(new Set());

  const toggleCollapse = (courseId: string) => {
    setCollapsedCourses(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  };

  const handleCreateCourse = async (name: string, color: string) => {
    if (!user) return;
    try {
      const course = await StorageService.saveCourse(user.id, name, color);
      setCourses(prev => [...prev, course]);
    } catch (err) {
      console.error('Failed to create course:', err);
    }
    setShowCourseManager(false);
  };

  const handleEditCourse = async (name: string, color: string) => {
    if (!user || !editingCourse) return;
    try {
      await StorageService.updateCourse(user.id, editingCourse.id, { name, color });
      setCourses(prev => prev.map(c => c.id === editingCourse.id ? { ...c, name, color } : c));
    } catch (err) {
      console.error('Failed to update course:', err);
    }
    setEditingCourse(null);
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!user || !confirm('Delete this course? Lectures will become uncategorized.')) return;
    try {
      await StorageService.deleteCourse(user.id, courseId);
      setCourses(prev => prev.filter(c => c.id !== courseId));
    } catch (err) {
      console.error('Failed to delete course:', err);
    }
  };

  const uncategorized = lectures.filter(l => !l.courseId);
  const getLectures = (courseId: string) => lectures.filter(l => l.courseId === courseId);

  const LectureItem = ({ lecture }: { lecture: SavedLecture }) => (
    <div
      className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${currentId === lecture.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50 border-transparent'} border`}
      onClick={() => onSelect(lecture)}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{lecture.title}</p>
        <p className="text-xs text-gray-500">{new Date(lecture.date).toLocaleDateString()}</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(lecture.id); }}
        className="hidden group-hover:block p-1 text-gray-400 hover:text-red-500 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );

  return (
    <div className="h-full bg-white border-r overflow-y-auto flex flex-col">
      <AgentJobStatusBar />
      <div className="p-4 flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Lectures
          </h2>
          <button
            onClick={() => setShowCourseManager(true)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-blue-600"
            title="New course"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {lectures.length === 0 && courses.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">No lectures saved yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Course groups */}
            {courses.map(course => {
              const courseLectures = getLectures(course.id);
              const isCollapsed = collapsedCourses.has(course.id);
              return (
                <div key={course.id}>
                  <div className="flex items-center gap-2 mb-1 group">
                    <button
                      onClick={() => toggleCollapse(course.id)}
                      className="flex items-center gap-2 flex-1 text-left"
                    >
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: course.color }} />
                      <span className="text-xs font-bold text-gray-700 uppercase tracking-wider truncate">{course.name}</span>
                      <span className="text-xs text-gray-400 ml-auto">{courseLectures.length}</span>
                      <svg className={`w-3 h-3 text-gray-400 flex-shrink-0 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <div className="hidden group-hover:flex gap-1">
                      <button onClick={() => setEditingCourse(course)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => handleDeleteCourse(course.id)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-500 transition-colors">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                  {!isCollapsed && courseLectures.length === 0 && (
                    <p className="text-xs text-gray-400 italic pl-4 py-1">No lectures yet</p>
                  )}
                  {!isCollapsed && (
                    <div className="space-y-1 pl-2">
                      {courseLectures.map(lecture => <LectureItem key={lecture.id} lecture={lecture} />)}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Uncategorized */}
            {uncategorized.length > 0 && (
              <div>
                {courses.length > 0 && (
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Uncategorized</p>
                )}
                <div className="space-y-1">
                  {uncategorized.map(lecture => <LectureItem key={lecture.id} lecture={lecture} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showCourseManager && (
        <CourseManager
          mode="create"
          onSave={handleCreateCourse}
          onCancel={() => setShowCourseManager(false)}
        />
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

export default HistorySidebar;
