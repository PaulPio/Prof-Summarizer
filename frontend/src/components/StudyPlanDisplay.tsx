import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { StudyPlan } from '../types';

interface StudyPlanDisplayProps {
  plan: StudyPlan;
  title?: string;
}

const StudyPlanDisplay: React.FC<StudyPlanDisplayProps> = ({ plan, title }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {(title || plan.courseName) && (
        <p className="text-sm text-amber-800 font-semibold">
          {title ?? `Plan for ${plan.courseName}`}
          {plan.planItems.length > 0 && ` · ${plan.planItems.length} steps`}
        </p>
      )}

      {plan.planItems.length === 0 ? (
        <p className="text-sm text-stone-500 bg-white rounded-xl border border-stone-200 px-4 py-4">
          No items in this plan.
        </p>
      ) : (
        <ol className="space-y-3 list-none">
          {plan.planItems.map((item, i) => (
            <li key={`${item.lectureId}-${i}`}>
              <button
                type="button"
                onClick={() => navigate(`/lecture/${item.lectureId}`)}
                className="w-full text-left flex items-start gap-3 p-4 bg-white rounded-2xl border border-stone-200 shadow-sm hover:border-amber-200 hover:shadow transition-all"
              >
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-stone-900 text-sm">{item.lectureTitle}</p>
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed">{item.reason}</p>
                  {item.suggestedActivities && item.suggestedActivities.length > 0 && (
                    <p className="text-xs text-amber-800 mt-2 font-medium">
                      {item.suggestedActivities.join(' · ')}
                    </p>
                  )}
                  {item.dueDate && (
                    <p className="text-xs text-stone-500 mt-1">
                      Suggested by{' '}
                      {new Date(item.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ol>
      )}

      {plan.knowledgeGaps.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-stone-700 uppercase tracking-wide">Topics to review</h3>
          <div className="flex flex-wrap gap-2">
            {plan.knowledgeGaps.map(gap => (
              <span
                key={gap}
                className="px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium"
              >
                {gap}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyPlanDisplay;
