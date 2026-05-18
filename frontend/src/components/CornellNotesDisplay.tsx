import React from 'react';
import { CornellNotes } from '../types';

interface CornellNotesDisplayProps {
  notes: CornellNotes;
  title: string;
}

const CornellNotesDisplay: React.FC<CornellNotesDisplayProps> = ({ notes, title }) => {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden print:shadow-none">
      <div className="bg-gradient-to-r from-amber-900 to-amber-800 text-amber-50 p-4 sm:p-6">
        <h2 className="font-serif text-xl sm:text-2xl leading-tight">{title}</h2>
        <p className="text-amber-200/90 text-sm mt-1">Cornell Notes</p>
      </div>

      <div className="flex flex-col md:flex-row min-h-[400px]">
        <div className="md:w-1/3 bg-stone-50 p-4 sm:p-6 border-b md:border-b-0 md:border-r border-stone-200">
          <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-amber-100 rounded flex items-center justify-center text-xs">💡</span>
            Cues & keywords
          </h3>
          <ul className="space-y-2">
            {notes.cues.map((cue, i) => (
              <li
                key={i}
                className="text-sm text-stone-800 font-medium bg-white px-3 py-2 rounded-lg border border-stone-200"
              >
                {cue}
              </li>
            ))}
          </ul>
        </div>

        <div className="md:w-2/3 p-4 sm:p-6">
          <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-stone-200 rounded flex items-center justify-center text-xs">📝</span>
            Detailed notes
          </h3>
          <ul className="space-y-3">
            {notes.notes.map((note, i) => (
              <li
                key={i}
                className="text-sm text-stone-700 leading-relaxed pl-4 border-l-2 border-amber-200"
              >
                {note}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-stone-200 bg-stone-50/80 p-4 sm:p-6">
        <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="w-6 h-6 bg-amber-100 rounded flex items-center justify-center text-xs">📋</span>
          Summary
        </h3>
        <p className="text-stone-700 leading-relaxed text-sm sm:text-base">{notes.summary}</p>
      </div>

      <div className="p-4 border-t border-stone-200 bg-white print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="w-full sm:w-auto px-4 py-2 bg-stone-900 text-stone-50 rounded-lg text-sm font-semibold hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print notes
        </button>
      </div>
    </div>
  );
};

export default CornellNotesDisplay;
