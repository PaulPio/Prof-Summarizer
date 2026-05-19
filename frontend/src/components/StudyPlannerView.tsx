import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { AgentService } from '../services/agentService';
import { StorageService } from '../services/storageService';
import { displayCourseColor } from '../constants/courseColors';
import type { SavedStudyPlan, StudyPlannerConfig, StudyPlan } from '../types';

const DEFAULT_MATERIALS: StudyPlannerConfig['materials'] = {
  summary: true,
  cornellNotes: true,
  flashcards: true,
  quiz: true,
};

type Intensity = 'light' | 'balanced' | 'crash';

const INTENSITY_LABELS: Record<Intensity, { label: string; desc: string }> = {
  light: { label: 'Light', desc: '~30 min/day' },
  balanced: { label: 'Balanced', desc: '~60 min/day' },
  crash: { label: 'Crash', desc: '~2 hr/day' },
};

interface StudyPlannerViewProps {
  onPlanGenerated: (plan: SavedStudyPlan) => void;
}

const StudyPlannerView: React.FC<StudyPlannerViewProps> = ({ onPlanGenerated }) => {
  const { lectures, courses, activeCourseId, addAgentJob, updateAgentJob, dismissAgentJob, user } = useAppContext();
  const [searchParams] = useSearchParams();

  const initialCourseId = searchParams.get('course') || activeCourseId || courses[0]?.id || '';

  const [step, setStep] = useState(1);
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId);
  const [selectedLectureIds, setSelectedLectureIds] = useState<Set<string>>(new Set());
  const [materials, setMaterials] = useState(DEFAULT_MATERIALS);
  const [deadline, setDeadline] = useState('');
  const [intensity, setIntensity] = useState<Intensity>('balanced');
  const [loading, setLoading] = useState(false);
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
  const lectureIdsKey = courseLectures.map(l => l.id).join(',');

  useEffect(() => {
    if (!selectedCourseId && coursesWithLectures[0]) setSelectedCourseId(coursesWithLectures[0].id);
  }, [selectedCourseId, coursesWithLectures]);

  useEffect(() => {
    setSelectedLectureIds(new Set(courseLectures.map(l => l.id)));
    setError(null);
  }, [selectedCourseId, lectureIdsKey]);

  const toggleLecture = (id: string) => {
    setSelectedLectureIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleMaterial = (key: keyof StudyPlannerConfig['materials']) => {
    setMaterials(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const anyMaterial = Object.values(materials).some(Boolean);

  const handleGenerate = async () => {
    if (!user || !selectedCourseId || selectedLectureIds.size === 0) {
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
    addAgentJob({ id: tempId, user_id: user.id, agent_type: 'study_planner', status: 'running', created_at: new Date().toISOString() });

    try {
      const response = await AgentService.triggerStudyPlanner(config);
      const jobId = response.jobId ?? tempId;
      if (jobId !== tempId) {
        dismissAgentJob(tempId);
        addAgentJob({ id: jobId, user_id: user.id, agent_type: 'study_planner', status: 'completed', created_at: response.createdAt ?? new Date().toISOString() });
      } else {
        updateAgentJob(tempId, { status: 'completed' });
      }
      const plan = response.result as StudyPlan;
      let saved: SavedStudyPlan;

      if (user.id === 'guest') {
        const courseName = plan.courseName ?? selectedCourse?.name ?? 'Course';
        const title = `${courseName} · ${config.lectureIds.length} lectures · ${new Date().toLocaleDateString()}`;
        saved = StorageService.saveStudyPlanGuest(user.id, selectedCourseId, title, config, plan, response.jobId);
      } else if (response.savedPlanId) {
        const list = await StorageService.listStudyPlans(user.id);
        saved = list.find(p => p.id === response.savedPlanId) ?? {
          id: response.savedPlanId, userId: user.id, courseId: selectedCourseId,
          title: plan.courseName ? `${plan.courseName} · ${config.lectureIds.length} lectures` : 'Study plan',
          config, plan, createdAt: response.completedAt ?? new Date().toISOString(), agentJobId: response.jobId,
        };
      } else {
        const courseName = plan.courseName ?? selectedCourse?.name ?? 'Course';
        const title = `${courseName} · ${config.lectureIds.length} lectures · ${new Date().toLocaleDateString()}`;
        saved = { id: response.jobId, userId: user.id, courseId: selectedCourseId, title, config, plan, createdAt: response.completedAt ?? new Date().toISOString(), agentJobId: response.jobId };
      }

      onPlanGenerated(saved);
      setStep(1);
    } catch (err) {
      updateAgentJob(tempId, { status: 'failed' });
      setError(err instanceof Error ? err.message : 'Failed to generate study plan.');
    } finally {
      setLoading(false);
    }
  };

  if (coursesWithLectures.length === 0) {
    return (
      <div style={{ padding: '20px 24px', background: 'var(--accent-soft)', border: '1px solid var(--accent-soft)', borderRadius: 'var(--r-lg)', fontSize: 13, color: 'var(--accent-text)', lineHeight: 1.6 }}>
        <strong>No course folders with lectures yet.</strong>
        <br />Assign lectures to a course from the sidebar, then return here to build a plan.
      </div>
    );
  }

  const steps = ['Course', 'Lectures', 'Materials', 'Shape'];

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Step header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-soft)', marginRight: 8 }}>New plan</div>
        {steps.map((s, i) => {
          const num = i + 1;
          const done = num < step;
          const active = num === step;
          return (
            <React.Fragment key={s}>
              <button
                type="button"
                onClick={() => { if (done) setStep(num); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0',
                  background: 'none', border: 'none', cursor: done ? 'pointer' : 'default',
                  color: active ? 'var(--text)' : done ? 'var(--accent)' : 'var(--text-soft)',
                }}
              >
                <span style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0, fontSize: 10, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: active ? 'var(--text)' : done ? 'var(--accent)' : 'var(--bg-sunken)',
                  color: active || done ? 'white' : 'var(--text-soft)',
                }}>
                  {done ? '✓' : num}
                </span>
                <span style={{ fontSize: 12, fontWeight: active ? 500 : 400 }}>{s}</span>
              </button>
              {i < steps.length - 1 && (
                <div style={{ width: 16, height: 1, background: 'var(--border)', flexShrink: 0 }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step content */}
      <div style={{ padding: '20px 24px' }}>
        {/* Step 1 — Course */}
        {step === 1 && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Choose a course folder</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {coursesWithLectures.map(c => {
                const count = lectures.filter(l => l.courseId === c.id).length;
                const active = selectedCourseId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCourseId(c.id)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', textAlign: 'left',
                      borderRadius: 'var(--r)', border: `2px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                      background: active ? 'var(--accent-soft)' : 'var(--bg)', cursor: 'pointer',
                    }}
                  >
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: displayCourseColor(c.color), flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', lineHeight: 1.3 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 2 }}>{count} lecture{count !== 1 ? 's' : ''}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <button className="btn btn-primary" onClick={() => setStep(2)} disabled={!selectedCourseId}>
              Next: Select lectures
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 6h8M7 3l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        )}

        {/* Step 2 — Lectures */}
        {step === 2 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Select lectures to include</div>
              <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                <button type="button" className="btn-ghost btn" style={{ padding: '2px 0', fontSize: 12 }} onClick={() => setSelectedLectureIds(new Set(courseLectures.map(l => l.id)))}>All</button>
                <button type="button" className="btn-ghost btn" style={{ padding: '2px 0', fontSize: 12 }} onClick={() => setSelectedLectureIds(new Set())}>Clear</button>
              </div>
            </div>
            <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', marginBottom: 12 }}>
              {courseLectures.map(lecture => {
                const checked = selectedLectureIds.has(lecture.id);
                return (
                  <label
                    key={lecture.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                      borderBottom: '1px solid var(--border-subtle)',
                      background: checked ? 'var(--accent-soft)' : 'transparent', cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox" checked={checked} onChange={() => toggleLecture(lecture.id)}
                      style={{ accentColor: 'var(--accent)', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lecture.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 1 }}>
                        {new Date(lecture.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        {lecture.flashcards?.length ? ` · ${lecture.flashcards.length} cards` : ''}
                        {lecture.confusionMarkers?.length ? ` · ${lecture.confusionMarkers.length} flags` : ''}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-soft)', marginBottom: 12 }}>{selectedLectureIds.size} of {courseLectures.length} selected</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => setStep(1)}>Back</button>
              <button className="btn btn-primary" onClick={() => setStep(3)} disabled={selectedLectureIds.size === 0}>
                Next: Choose materials
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Materials */}
        {step === 3 && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Materials to study</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {([
                { key: 'summary' as const, label: 'Summaries & key points', icon: '📝' },
                { key: 'cornellNotes' as const, label: 'Cornell notes', icon: '📋' },
                { key: 'flashcards' as const, label: 'Flashcards', icon: '🃏' },
                { key: 'quiz' as const, label: 'Quizzes', icon: '✅' },
              ]).map(({ key, label, icon }) => (
                <label
                  key={key}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer',
                    borderRadius: 'var(--r)', border: `2px solid ${materials[key] ? 'var(--accent)' : 'var(--border)'}`,
                    background: materials[key] ? 'var(--accent-soft)' : 'var(--bg)',
                  }}
                >
                  <input type="checkbox" checked={materials[key]} onChange={() => toggleMaterial(key)} style={{ accentColor: 'var(--accent)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{icon} {label}</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => setStep(2)}>Back</button>
              <button className="btn btn-primary" onClick={() => setStep(4)} disabled={!anyMaterial}>
                Next: Set deadline
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — Shape */}
        {step === 4 && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Study shape</div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: 8 }}>Deadline (optional)</div>
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '7px 10px', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: 8 }}>Daily intensity</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(Object.keys(INTENSITY_LABELS) as Intensity[]).map(k => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setIntensity(k)}
                    style={{
                      padding: '8px 14px', borderRadius: 'var(--r-sm)', fontSize: 12, cursor: 'pointer',
                      border: `2px solid ${intensity === k ? 'var(--accent)' : 'var(--border)'}`,
                      background: intensity === k ? 'var(--accent-soft)' : 'var(--bg)',
                      color: intensity === k ? 'var(--accent-text)' : 'var(--text-muted)',
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{INTENSITY_LABELS[k].label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-soft)' }}>{INTENSITY_LABELS[k].desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div style={{ marginBottom: 16, padding: '8px 12px', borderRadius: 'var(--r-sm)', background: 'var(--bad-soft)', border: '1px solid var(--bad)', color: 'var(--bad)', fontSize: 12 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn" onClick={() => setStep(3)}>Back</button>
              <button
                className="btn btn-accent"
                type="button"
                onClick={handleGenerate}
                disabled={loading || selectedLectureIds.size === 0 || !anyMaterial}
              >
                {loading ? (
                  <>
                    <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 700ms linear infinite' }} />
                    Building plan…
                  </>
                ) : 'Generate study plan'}
              </button>
              <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>
                {selectedLectureIds.size} lecture{selectedLectureIds.size !== 1 ? 's' : ''} · {selectedCourse?.name}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyPlannerView;
