import React from 'react';
import { CornellNotes } from '../types';

interface CornellNotesDisplayProps {
    notes: CornellNotes;
    title: string;
}

const CornellNotesDisplay: React.FC<CornellNotesDisplayProps> = ({ notes, title }) => {
    return (
        <div className="bg-white rounded-2xl border shadow-lg overflow-hidden print:shadow-none">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 sm:p-6">
                <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
                <p className="text-indigo-200 text-sm mt-1">Cornell Notes Format</p>
            </div>

            {/* Two-column layout */}
            <div className="flex flex-col md:flex-row min-h-[400px]">
                {/* Left column - Cues */}
                <div className="md:w-1/3 bg-indigo-50 p-4 sm:p-6 border-b md:border-b-0 md:border-r border-indigo-100">
                    <h3 className="text-sm font-bold text-indigo-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 bg-indigo-200 rounded flex items-center justify-center text-xs">💡</span>
                        Cues & Keywords
                    </h3>
                    <ul className="space-y-3">
                        {notes.cues.map((cue, i) => (
                            <li
                                key={i}
                                className="text-sm text-indigo-900 font-medium bg-white px-3 py-2 rounded-lg border border-indigo-100 shadow-sm"
                            >
                                {cue}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Right column - Notes */}
                <div className="md:w-2/3 p-4 sm:p-6">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center text-xs">📝</span>
                        Detailed Notes
                    </h3>
                    <ul className="space-y-3">
                        {notes.notes.map((note, i) => (
                            <li
                                key={i}
                                className="text-sm text-gray-700 leading-relaxed pl-4 border-l-2 border-gray-200"
                            >
                                {note}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Bottom - Summary */}
            <div className="border-t bg-gradient-to-b from-gray-50 to-white p-4 sm:p-6">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 bg-amber-100 rounded flex items-center justify-center text-xs">📋</span>
                    Summary
                </h3>
                <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
                    {notes.summary}
                </p>
            </div>

            {/* Print button */}
            <div className="p-4 border-t bg-gray-50 print:hidden">
                <button
                    onClick={() => window.print()}
                    className="w-full sm:w-auto px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print Notes
                </button>
            </div>
        </div>
    );
};

export default CornellNotesDisplay;
