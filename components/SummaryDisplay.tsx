
import React from 'react';
import { LectureSummary } from '../types';

interface SummaryDisplayProps {
  summary: LectureSummary;
  title: string;
}

const SummaryDisplay: React.FC<SummaryDisplayProps> = ({ summary, title }) => {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="border-b pb-3 sm:pb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Lecture Insight Analysis</p>
      </div>

      <section>
        <h3 className="text-base sm:text-lg font-semibold text-blue-700 flex items-center gap-2 mb-2 sm:mb-3">
          <span className="p-1 bg-blue-100 rounded">📝</span> Overview
        </h3>
        <p className="text-gray-700 leading-relaxed bg-white p-3 sm:p-4 rounded-xl border shadow-sm text-sm sm:text-base">
          {summary.overview}
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <section>
          <h3 className="text-base sm:text-lg font-semibold text-indigo-700 flex items-center gap-2 mb-2 sm:mb-3">
            <span className="p-1 bg-indigo-100 rounded">💡</span> Key Takeaways
          </h3>
          <ul className="space-y-2">
            {summary.keyPoints.map((point, i) => (
              <li key={i} className="flex gap-2 sm:gap-3 text-gray-700 bg-white p-2.5 sm:p-3 rounded-lg border shadow-sm text-sm sm:text-base">
                <span className="text-indigo-500 font-bold">•</span>
                {point}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4 sm:space-y-6">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-green-700 flex items-center gap-2 mb-2 sm:mb-3">
              <span className="p-1 bg-green-100 rounded">📖</span> Vocabulary
            </h3>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {summary.vocabulary.map((v, i) => (
                <div key={i} className="group relative">
                  <span className="px-2.5 sm:px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-200 text-xs sm:text-sm cursor-help font-medium">
                    {v.term}
                  </span>
                  <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 sm:w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                    {v.definition}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-semibold text-red-700 flex items-center gap-2 mb-2 sm:mb-3">
              <span className="p-1 bg-red-100 rounded">🎯</span> Action Items
            </h3>
            <ul className="space-y-2">
              {summary.actionItems.length > 0 ? (
                summary.actionItems.map((item, i) => (
                  <li key={i} className="flex gap-2 text-gray-700 bg-red-50 p-2.5 sm:p-3 rounded-lg border border-red-100 shadow-sm italic text-sm sm:text-base">
                    <span className="text-red-500">→</span> {item}
                  </li>
                ))
              ) : (
                <p className="text-gray-400 text-xs sm:text-sm italic">No specific action items identified.</p>
              )}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SummaryDisplay;
