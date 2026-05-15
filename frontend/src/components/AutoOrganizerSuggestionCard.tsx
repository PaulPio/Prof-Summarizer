import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { StorageService } from '../services/storageService';

interface AutoOrganizerSuggestion {
  suggestedCourseId: string | null;
  confidence: number;
  alternativeCourseIds: string[];
  topicTags: string[];
}

interface Props {
  lectureId: string;
  suggestion: AutoOrganizerSuggestion;
  onAccepted: (courseId: string) => void;
  onDismissed: () => void;
}

const AutoOrganizerSuggestionCard: React.FC<Props> = ({ lectureId, suggestion, onAccepted, onDismissed }) => {
  const { courses, user, setLectures } = useAppContext();
  const [accepting, setAccepting] = useState(false);

  if (!suggestion.suggestedCourseId) return null;

  const suggestedCourse = courses.find(c => c.id === suggestion.suggestedCourseId);
  if (!suggestedCourse) return null;

  const confidencePct = Math.round(suggestion.confidence * 100);
  const isLowConfidence = suggestion.confidence < 0.6;

  const handleAccept = async () => {
    if (!user || !suggestion.suggestedCourseId) return;
    setAccepting(true);
    try {
      await StorageService.updateLectureCourse(lectureId, user.id, suggestion.suggestedCourseId);
      setLectures(prev => prev.map(l => l.id === lectureId ? { ...l, courseId: suggestion.suggestedCourseId! } : l));
      onAccepted(suggestion.suggestedCourseId);
    } catch (err) {
      console.error('Failed to assign course:', err);
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-indigo-500 text-lg">🤖</span>
          <div>
            <p className="text-sm font-semibold text-indigo-800">
              {isLowConfidence ? 'Suggested course (low confidence)' : 'Auto-organized'}
            </p>
            <p className="text-xs text-indigo-600 mt-0.5">
              {confidencePct}% confidence
            </p>
          </div>
        </div>
        <button
          onClick={onDismissed}
          className="text-indigo-400 hover:text-indigo-600 text-lg leading-none"
          aria-label="Dismiss suggestion"
        >
          ×
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: suggestedCourse.color }}
        >
          {suggestedCourse.name}
        </span>
      </div>

      {suggestion.topicTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {suggestion.topicTags.map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded-full bg-white border border-indigo-200 text-indigo-700 text-xs">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleAccept}
          disabled={accepting}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {accepting ? 'Assigning…' : 'Accept'}
        </button>
        <button
          onClick={onDismissed}
          className="px-4 py-2 bg-white border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-50 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default AutoOrganizerSuggestionCard;
