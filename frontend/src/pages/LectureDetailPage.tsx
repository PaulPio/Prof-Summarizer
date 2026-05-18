import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Flashcard, QuizQuestion } from '../types';
import { StorageService } from '../services/storageService';
import { useAppContext } from '../context/AppContext';
import SummaryDisplay from '../components/SummaryDisplay';
import CornellNotesDisplay from '../components/CornellNotesDisplay';
import StudyModePanel from '../components/StudyModePanel';
import ChatWindow from '../components/ChatWindow';
import NotionExportModal from '../components/NotionExportModal';
import ResearchPanel from '../components/ResearchPanel';
import AutoOrganizerSuggestionCard from '../components/AutoOrganizerSuggestionCard';
import { displayCourseColor } from '../constants/courseColors';

const LectureDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, lectures, setLectures, courses, userSettings, agentJobs, fetchLectures } = useAppContext();

  const lecture = lectures.find(l => l.id === id);

  const isStudyMaterialsLoading = agentJobs.some(
    j => j.lecture_id === id && j.agent_type === 'pipeline' && j.status === 'running',
  );

  useEffect(() => {
    if (!id || !isStudyMaterialsLoading) return;
    const interval = setInterval(() => {
      fetchLectures().catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [id, isStudyMaterialsLoading, fetchLectures]);

  const [showCornellNotes, setShowCornellNotes] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showNotionExport, setShowNotionExport] = useState(false);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);

  if (!lecture) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-gray-500">Lecture not found.</p>
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-amber-800 text-amber-50 rounded-xl font-semibold text-sm hover:bg-amber-900">Back home</button>
        </div>
      </div>
    );
  }

  const handleFlashcardsGenerated = async (flashcards: Flashcard[]) => {
    if (!user) return;
    const updated = { ...lecture, flashcards };
    setLectures(prev => prev.map(l => l.id === lecture.id ? updated : l));
    try {
      await StorageService.updateLectureFlashcards(lecture.id, user.id, flashcards);
    } catch (err) {
      console.error('Failed to save flashcards:', err);
    }
  };

  const handleQuizGenerated = async (quizData: QuizQuestion[]) => {
    if (!user) return;
    const updated = { ...lecture, quizData };
    setLectures(prev => prev.map(l => l.id === lecture.id ? updated : l));
    try {
      await StorageService.updateLectureQuiz(lecture.id, user.id, quizData);
    } catch (err) {
      console.error('Failed to save quiz data:', err);
    }
  };

  const suggestion = (lecture as any).autoOrganizerSuggestions;
  const showSuggestion =
    !suggestionDismissed &&
    !lecture.courseId &&
    suggestion?.suggestedCourseId &&
    userSettings?.agentAutoOrganizer;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-12">
      <div className="max-w-4xl mx-auto pb-24 px-2 sm:px-0 space-y-8">
        <div className="flex items-center justify-between">
          {lecture.courseId && (() => {
            const course = courses.find(c => c.id === lecture.courseId);
            return course ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-stone-200 text-stone-800 shadow-sm">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: displayCourseColor(course.color) }}
                  aria-hidden
                />
                {course.name}
              </span>
            ) : (
              <span />
            );
          })()}
          {userSettings?.hasNotionConnection && (
            <button
              onClick={() => setShowNotionExport(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-stone-50 rounded-xl text-xs font-semibold hover:bg-stone-800 transition-colors"
            >
              <span>📓</span> Export to Notion
            </button>
          )}
        </div>

        {showSuggestion && (
          <AutoOrganizerSuggestionCard
            lectureId={lecture.id}
            suggestion={suggestion}
            onAccepted={() => setSuggestionDismissed(true)}
            onDismissed={() => setSuggestionDismissed(true)}
          />
        )}

        {lecture.cornellNotes && (
          <div className="flex items-center justify-center gap-2 bg-stone-100 rounded-full p-1 w-fit mx-auto border border-stone-200">
            <button type="button" onClick={() => setShowCornellNotes(true)} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${showCornellNotes ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}>
              📋 Cornell Notes
            </button>
            <button type="button" onClick={() => setShowCornellNotes(false)} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${!showCornellNotes ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}>
              📝 Classic Summary
            </button>
          </div>
        )}

        {showCornellNotes && lecture.cornellNotes ? (
          <CornellNotesDisplay notes={lecture.cornellNotes} title={lecture.title} />
        ) : (
          <SummaryDisplay summary={lecture.summary} title={lecture.title} />
        )}

        <StudyModePanel
          transcript={lecture.transcript}
          lectureId={lecture.id}
          initialFlashcards={lecture.flashcards}
          initialQuizData={lecture.quizData}
          isStudyMaterialsLoading={isStudyMaterialsLoading}
          onFlashcardsGenerated={handleFlashcardsGenerated}
          onQuizGenerated={handleQuizGenerated}
        />

        {lecture.confusionMarkers && lecture.confusionMarkers.length > 0 && (
          <div className="p-6 sm:p-8 bg-white rounded-[20px] sm:rounded-[32px] border shadow-sm space-y-4">
            <ResearchPanel
              lectureId={lecture.id}
              confusionMarkers={lecture.confusionMarkers}
            />
          </div>
        )}

        <div className="mt-10 sm:mt-16 pt-10 sm:pt-16 border-t border-gray-100">
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer list-none p-4 sm:p-6 bg-white rounded-[20px] sm:rounded-[32px] border shadow-sm hover:bg-gray-50 transition-all">
              <span className="font-black text-gray-800 text-sm sm:text-base">Review Full Transcript Archive</span>
              <span className="group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="mt-4 sm:mt-6 p-4 sm:p-10 bg-gray-900 text-blue-100 rounded-[20px] sm:rounded-[40px] shadow-2xl font-mono text-xs sm:text-sm leading-relaxed max-h-[400px] sm:max-h-[600px] overflow-y-auto">
              {lecture.transcript}
            </div>
          </details>
        </div>
      </div>

      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-amber-800 text-amber-50 rounded-full shadow-lg shadow-amber-900/20 hover:bg-amber-900 hover:scale-105 transition-all flex items-center justify-center group"
        title="Ask Professor"
      >
        <span className="text-2xl">💬</span>
        <div className="absolute right-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
            Ask Professor
            <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900"></div>
          </div>
        </div>
      </button>

      <ChatWindow transcript={lecture.transcript} isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {showNotionExport && (
        <NotionExportModal lecture={lecture} onClose={() => setShowNotionExport(false)} />
      )}
    </div>
  );
};

export default LectureDetailPage;
