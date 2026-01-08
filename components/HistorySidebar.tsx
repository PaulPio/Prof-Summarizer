
import React from 'react';
import { SavedLecture } from '../types';

interface HistorySidebarProps {
  lectures: SavedLecture[];
  onSelect: (lecture: SavedLecture) => void;
  onDelete: (id: string) => void;
  currentId?: string;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ lectures, onSelect, onDelete, currentId }) => {
  return (
    <div className="h-full bg-white border-r overflow-y-auto">
      <div className="p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Lecture History
        </h2>
        {lectures.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">No lectures saved yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {lectures.map((lecture) => (
              <div
                key={lecture.id}
                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                  currentId === lecture.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50 border-transparent'
                } border`}
                onClick={() => onSelect(lecture)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{lecture.title}</p>
                  <p className="text-xs text-gray-500">{lecture.date}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(lecture.id);
                  }}
                  className="hidden group-hover:block p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistorySidebar;
