import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { STUDY_PLANNER_ENABLED } from '../constants/featureFlags';

interface StudyDeskDashboardProps {
  onStartRecording: () => void;
  onUploadAudio: () => void;
}

const StudyDeskDashboard: React.FC<StudyDeskDashboardProps> = ({ onStartRecording, onUploadAudio }) => {
  const navigate = useNavigate();
  const { lectures, courses, activeCourseId, userSettings } = useAppContext();

  const activeCourse = courses.find(c => c.id === activeCourseId);

  const scopedLectures = useMemo(() => {
    if (!activeCourseId) return lectures;
    return lectures.filter(l => l.courseId === activeCourseId);
  }, [lectures, activeCourseId]);

  const withCornell = scopedLectures.filter(l => l.cornellNotes).length;
  const flashcardTotal = scopedLectures.reduce((n, l) => n + (l.flashcards?.length ?? 0), 0);
  const quizTaken = scopedLectures.filter(l => (l.quizData?.length ?? 0) > 0).length;

  const continueLecture = [...scopedLectures].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )[0];

  const plannerEnabled = STUDY_PLANNER_ENABLED && userSettings?.agentStudyPlanner;

  return (
    <article className="max-w-2xl">
      <p className="text-amber-800 text-xs font-semibold uppercase tracking-wide">
        Dashboard{activeCourse ? ` · ${activeCourse.name}` : ''}
      </p>
      <h1 className="font-serif text-4xl text-stone-900 mt-2 leading-tight">Your study desk</h1>
      <p className="text-stone-600 mt-3 leading-relaxed">
        Everything for your selected course in one calm workspace — capture, notes, and review.
      </p>

      <section className="mt-8 grid md:grid-cols-2 gap-4 max-w-4xl">
        <article className="md:col-span-2 p-6 bg-white rounded-2xl border border-stone-200 shadow-sm">
          <h2 className="font-bold text-stone-800 flex items-center gap-2">
            <span aria-hidden>🎙️</span> New lecture
          </h2>
          <p className="text-sm text-stone-500 mt-2">Record now or upload when you are back at your desk.</p>
          <p className="flex flex-wrap gap-3 mt-4">
            <button
              type="button"
              onClick={onStartRecording}
              className="px-5 py-2.5 bg-amber-800 text-amber-50 rounded-lg text-sm font-semibold hover:bg-amber-900 transition-colors"
            >
              Record
            </button>
            <button
              type="button"
              onClick={onUploadAudio}
              className="px-5 py-2.5 border border-stone-300 rounded-lg text-sm font-semibold hover:bg-stone-50 transition-colors"
            >
              Upload
            </button>
          </p>
        </article>

        <article className="p-5 bg-white rounded-2xl border border-stone-200 shadow-sm">
          <p className="font-serif text-3xl text-amber-800/30 leading-none">01</p>
          <h3 className="font-bold mt-2 text-stone-900">Cornell notes</h3>
          <p className="text-sm text-stone-500 mt-1">
            {withCornell} lecture{withCornell !== 1 ? 's' : ''} with structured notes
          </p>
        </article>

        <article className="p-5 bg-white rounded-2xl border border-stone-200 shadow-sm">
          <p className="font-serif text-3xl text-amber-800/30 leading-none">02</p>
          <h3 className="font-bold mt-2 text-stone-900">Study tools</h3>
          <p className="text-sm text-stone-500 mt-1">
            {flashcardTotal} cards · {quizTaken} quiz{quizTaken !== 1 ? 'zes' : ''} taken
          </p>
        </article>

        {continueLecture && (
          <article className="md:col-span-2 p-5 bg-stone-50 rounded-2xl border border-stone-200">
            <h3 className="font-bold text-stone-800">Continue where you left off</h3>
            <p className="text-sm text-stone-600 mt-1">{continueLecture.title}</p>
            <button
              type="button"
              onClick={() => navigate(`/lecture/${continueLecture.id}`)}
              className="mt-3 text-sm font-semibold text-amber-800 hover:text-amber-900"
            >
              Open lecture →
            </button>
          </article>
        )}

        {plannerEnabled && (
          <article className="p-5 bg-amber-50 rounded-2xl border border-amber-100 md:col-span-2">
            <h3 className="font-bold text-amber-950">Study planner</h3>
            <p className="text-sm text-amber-900/80 mt-2">
              Build a review plan for this course folder — pick lectures and materials to include.
            </p>
            <button
              type="button"
              onClick={() => {
                const q = activeCourseId ? `?course=${activeCourseId}` : '';
                navigate(`/planner${q}`);
              }}
              className="mt-4 text-sm font-semibold text-amber-800 hover:underline"
            >
              Open planner →
            </button>
          </article>
        )}
      </section>
    </article>
  );
};

export default StudyDeskDashboard;
