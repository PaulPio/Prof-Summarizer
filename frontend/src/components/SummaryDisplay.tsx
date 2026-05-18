
import React from 'react';
import { LectureSummary } from '../types';

interface SummaryDisplayProps {
  summary: LectureSummary;
  title: string;
}

const SummaryDisplay: React.FC<SummaryDisplayProps> = ({ summary, title }) => {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="border-b border-stone-200 pb-3 sm:pb-4">
        <h2 className="font-serif text-xl sm:text-2xl text-stone-900">{title}</h2>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">Classic summary</p>
      </div>

      <section>
        <h3 className="text-base sm:text-lg font-semibold text-amber-900 flex items-center gap-2 mb-2 sm:mb-3">
          <span className="p-1 bg-amber-100 rounded">📝</span> Overview
        </h3>
        <p className="text-stone-700 leading-relaxed bg-white p-3 sm:p-4 rounded-xl border border-stone-200 shadow-sm text-sm sm:text-base">
          {summary.overview}
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <section>
          <h3 className="text-base sm:text-lg font-semibold text-stone-800 flex items-center gap-2 mb-2 sm:mb-3">
            <span className="p-1 bg-stone-200 rounded">💡</span> Key takeaways
          </h3>
          <ul className="space-y-2">
            {summary.keyPoints.map((point, i) => (
              <li key={i} className="flex gap-2 sm:gap-3 text-stone-700 bg-white p-2.5 sm:p-3 rounded-lg border border-stone-200 text-sm sm:text-base">
                <span className="text-amber-800 font-bold">•</span>
                {point}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4 sm:space-y-6">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-stone-800 flex items-center gap-2 mb-2 sm:mb-3">
              <span className="p-1 bg-stone-200 rounded">📖</span> Vocabulary
            </h3>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {summary.vocabulary.map((v, i) => (
                <div key={i} className="group relative">
                  <span className="px-2.5 sm:px-3 py-1 bg-amber-50 text-amber-900 rounded-full border border-amber-200 text-xs sm:text-sm cursor-help font-medium">
                    {v.term}
                  </span>
                  <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 sm:w-48 p-2 bg-stone-900 text-stone-50 text-xs rounded shadow-lg z-10">
                    {v.definition}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-semibold text-amber-900 flex items-center gap-2 mb-2 sm:mb-3">
              <span className="p-1 bg-amber-100 rounded">🎯</span> Action items
            </h3>
            <ul className="space-y-2">
              {summary.actionItems.length > 0 ? (
                summary.actionItems.map((item, i) => (
                  <li key={i} className="flex gap-2 text-stone-700 bg-amber-50/50 p-2.5 sm:p-3 rounded-lg border border-amber-100 text-sm sm:text-base">
                    <span className="text-amber-800">→</span> {item}
                  </li>
                ))
              ) : (
                <p className="text-stone-400 text-xs sm:text-sm italic">No specific action items identified.</p>
              )}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SummaryDisplay;
