import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { AgentService } from '../services/agentService';
import type { SavedLecture, StudyPlannerConfig } from '../types';

interface StudyPlanItem {
  lectureId: string;
  lectureTitle: string;
  reason: string;
  suggestedActivities?: string[];
  dueDate?: string;
}

interface StudyPlan {
  planItems: StudyPlanItem[];
  knowledgeGaps: string[];
  courseName?: string;
  courseId?: string;
}

const DEFAULT_MATERIALS: StudyPlannerConfig['materials'] = {
  summary: true,
  cornellNotes: true,
  flashcards: true,
  quiz: true,
};

const StudyPlannerView: React.FC = () => {
  const { lectures, courses, activeCourseId, addAgentJob, updateAgentJob, user } = useAppContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialCourseId = searchParams.get('course') || activeCourseId || courses[0]?.id || '';

  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId);
  const [selectedLectureIds, setSelectedLectureIds] = useState<Set<string>>(new Set());
  const [materials, setMaterials] = useState(DEFAULT_MATERIALS);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const coursesWithLectures = useMemo(() => {
    const ids = new Set(lectures.filter(l => l.courseId).map(l => l.courseId!));
    return courses.filter(c => ids.has(c.id));
  }, [courses, lectures]);

  const courseLectures = useMemo(() => {
    if (!selectedCourseId) return [];
    return lectures
      .filter(l => l.courseId === selectedCourseId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [lectures, selectedCourseId]);

  const selectedCourse = courses.find(c => c.id === selectedCourseId);

  useEffect(() => {
    if (!selectedCourseId && coursesWithLectures[0]) {
      setSelectedCourseId(coursesWithLectures[0].id);
    }
  }, [selectedCourseId, coursesWithLectures]);

  useEffect(() => {
    setSelectedLectureIds(new Set(courseLectures.map(l => l.id)));
    setPlan(null);
    setError(null);
  }, [selectedCourseId, courseLectures.map(l => l.id).join(',')]);

  const toggleLecture = (id: string) => {
    setSelectedLectureIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllLectures = () => setSelectedLectureIds(new Set(courseLectures.map(l => l.id)));
  const selectNoneLectures = () => setSelectedLectureIds(new Set());

  const toggleMaterial = (key: keyof StudyPlannerConfig['materials']) => {
    setMaterials(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const anyMaterial = Object.values(materials).some(Boolean);

  const handleGenerate = async () => {
    if (!selectedCourseId || selectedLectureIds.size === 0) {
      setError('Choose a course and at least one lecture.');
      return;
    }
    if (!anyMaterial) {
      setError('Select at least one type of material to include.');
      return;
    }

    const config: StudyPlannerConfig = {
      courseId: selectedCourseId,
      lectureIds: [...selectedLectureIds],
      materials: { ...materials },
    };

    setLoading(true);
    setError(null);
    const tempId = `planner-${Date.now()}`;
    addAgentJob({
      id: tempId,
      user_id: user?.id ?? '',
      agent_type: 'study_planner',
      status: 'running',
      created_at: new Date().toISOString(),
    });

    try {
      const response = await AgentService.triggerStudyPlanner(config);
      updateAgentJob(response.jobId ?? tempId, { status: 'completed' });
      setPlan(response.result as StudyPlan);
    } catch (err) {
      updateAgentJob(tempId, { status: 'failed' });
      const message = err instanceof Error ? err.message : 'Failed to generate study plan.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const formatLectureMeta = (lecture: SavedLecture) => {
    const bits: string[] = [];
    if (materials.summary && lecture.summary?.overview) bits.push('summary');
    if (materials.cornellNotes && lecture.cornellNotes) bits.push('Cornell');
    if (materials.flashcards) {
      bits.push(lecture.flashcards?.length ? `${lecture.flashcards.length} cards` : 'no cards');
    }
    if (materials.quiz) {
      bits.push(lecture.quizData?.length ? 'quiz ready' : 'no quiz');
    }
    return bits.join(' · ');
  };

  if (coursesWithLectures.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-6 text-sm text-amber-950">
        <p className="font-semibold">No course folders with lectures yet</p>
        <p className="mt-2 text-amber-900/80">
          Assign lectures to a course from the sidebar, then return here to build a plan for that folder only.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-2xl border border-stone-200 bg-stone-50/50 p-5 sm:p-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Study planner</p>
        <h2 className="font-serif text-2xl text-stone-900 mt-1">Plan one course at a time</h2>
        <p className="text-sm text-stone-600 mt-2 max-w-xl">
          Pick a course folder, choose which lectures to include, and tell the planner which materials to weigh.
          Plans never mix lectures from different courses.
        </p>
      </header>

      {/* Step 1 — Course */}
      <section className="space-y-2">
        <h3 className="text-sm font-bold text-stone-800">1. Course folder</h3>
        <select
          value={selectedCourseId}
          onChange={e => setSelectedCourseId(e.target.value)}
          className="w-full max-w-md text-sm border border-stone-200 rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-800/20"
        >
          {coursesWithLectures.map(c => (
            <option key={c.id} value={c.id}>
              {c.name} ({lectures.filter(l => l.courseId === c.id).length} lectures)
            </option>
          ))}
        </select>
        {selectedCourse && (
          <p className="text-xs text-stone-500 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selectedCourse.color }} />
            Planning only material filed under {selectedCourse.name}
          </p>
        )}
      </section>

      {/* Step 2 — Lectures */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-stone-800">2. Lectures in this folder</h3>
          <div className="flex gap-2 text-xs">
            <button type="button" onClick={selectAllLectures} className="text-amber-800 font-semibold hover:underline">
              Select all
            </button>
            <span className="text-stone-300">|</span>
            <button type="button" onClick={selectNoneLectures} className="text-stone-600 font-semibold hover:underline">
              Clear
            </button>
          </div>
        </div>

        {courseLectures.length === 0 ? (
          <p className="text-sm text-stone-500 bg-white rounded-xl border border-stone-200 p-4">
            No lectures in this course yet. Drag lectures into this folder from the lecture list.
          </p>
        ) : (
          <ul className="max-h-56 overflow-y-auto space-y-2 rounded-xl border border-stone-200 bg-white p-2">
            {courseLectures.map(lecture => {
              const checked = selectedLectureIds.has(lecture.id);
              return (
                <li key={lecture.id}>
                  <label
                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      checked ? 'bg-amber-50 border border-amber-100' : 'hover:bg-stone-50 border border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleLecture(lecture.id)}
                      className="mt-1 rounded border-stone-300 text-amber-800 focus:ring-amber-800"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-stone-900 truncate">{lecture.title}</p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {new Date(lecture.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        {formatLectureMeta(lecture) ? ` · ${formatLectureMeta(lecture)}` : ''}
                      </p>
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs text-stone-500">{selectedLectureIds.size} of {courseLectures.length} selected</p>
      </section>

      {/* Step 3 — Materials */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-stone-800">3. Materials to include in the plan</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          {(
            [
              { key: 'summary' as const, label: 'Summaries & key points', desc: 'Overview and takeaways' },
              { key: 'cornellNotes' as const, label: 'Cornell notes', desc: 'Cues and note summaries' },
              { key: 'flashcards' as const, label: 'Flashcards', desc: 'Whether cards exist per lecture' },
              { key: 'quiz' as const, label: 'Quizzes', desc: 'Whether a quiz exists per lecture' },
            ] as const
          ).map(({ key, label, desc }) => (
            <label
              key={key}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${
                materials[key] ? 'bg-white border-amber-200' : 'bg-stone-100/80 border-stone-200 opacity-80'
              }`}
            >
              <input
                type="checkbox"
                checked={materials[key]}
                onChange={() => toggleMaterial(key)}
                className="mt-0.5 rounded border-stone-300 text-amber-800 focus:ring-amber-800"
              />
              <div>
                <p className="text-sm font-semibold text-stone-900">{label}</p>
                <p className="text-xs text-stone-500">{desc}</p>
              </div>
            </label>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-stone-200">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || selectedLectureIds.size === 0 || !anyMaterial}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-800 text-amber-50 rounded-xl text-sm font-semibold hover:bg-amber-900 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-amber-200 border-t-transparent rounded-full animate-spin" />
              Building plan…
            </>
          ) : (
            <>📅 {plan ? 'Regenerate plan' : 'Generate study plan'}</>
          )}
        </button>
        {plan && (
          <p className="text-xs text-stone-500">
            Regenerating replaces the plan below (same course & selection).
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
      )}

      {plan && (
        <div className="space-y-6 pt-4 border-t border-stone-200">
          {plan.courseName && (
            <p className="text-sm text-amber-800 font-semibold">
              Plan for {plan.courseName}
              {plan.planItems.length > 0 && ` · ${plan.planItems.length} steps`}
            </p>
          )}

          {plan.planItems.length === 0 ? (
            <p className="text-sm text-stone-500 bg-white rounded-xl border border-stone-200 px-4 py-4">
              No items generated. Try selecting more lectures or enabling more materials.
            </p>
          ) : (
            <ol className="space-y-3 list-none">
              {plan.planItems.map((item, i) => (
                <li key={item.lectureId}>
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
      )}
    </div>
  );
};

export default StudyPlannerView;
