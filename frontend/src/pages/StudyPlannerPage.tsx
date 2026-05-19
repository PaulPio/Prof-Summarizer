import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import StudyPlannerView from '../components/StudyPlannerView';
import StudyPlanDisplay from '../components/StudyPlanDisplay';
import { StorageService } from '../services/storageService';
import { displayCourseColor } from '../constants/courseColors';
import TopBar from '../components/TopBar';
import type { SavedStudyPlan } from '../types';

const StudyPlannerPage: React.FC = () => {
  const { user, userSettings, courses } = useAppContext();
  const [savedPlans, setSavedPlans] = useState<SavedStudyPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [planReadyBanner, setPlanReadyBanner] = useState<string | null>(null);
  const planPanelRef = useRef<HTMLElement>(null);

  const loadPlans = useCallback(async () => {
    if (!user) return;
    setLoadingPlans(true);
    try {
      const list = await StorageService.listStudyPlans(user.id);
      setSavedPlans(list);
      setSelectedPlanId(prev => {
        if (prev && list.some(p => p.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch (err) {
      console.error('Failed to load study plans:', err);
    } finally {
      setLoadingPlans(false);
    }
  }, [user]);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const selectedPlan = savedPlans.find(p => p.id === selectedPlanId) ?? null;

  const handlePlanGenerated = (plan: SavedStudyPlan) => {
    setSavedPlans(prev => [plan, ...prev.filter(p => p.id !== plan.id)]);
    setSelectedPlanId(plan.id);
    setPlanReadyBanner(plan.title);
    window.setTimeout(() => planPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const handleDelete = async (planId: string) => {
    if (!user) return;
    if (!confirm('Delete this study plan? This cannot be undone.')) return;
    setDeletingId(planId);
    try {
      await StorageService.deleteStudyPlan(user.id, planId);
      setSavedPlans(prev => {
        const next = prev.filter(p => p.id !== planId);
        if (selectedPlanId === planId) setSelectedPlanId(next[0]?.id ?? null);
        return next;
      });
    } catch (err) {
      console.error('Failed to delete study plan:', err);
    } finally {
      setDeletingId(null);
    }
  };

  if (!userSettings?.agentStudyPlanner) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar breadcrumb={<span style={{ fontSize: 12, fontWeight: 500 }}>Study planner</span>} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
          <div style={{ maxWidth: 400, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>📋</div>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 8px' }}>Turn on the study planner</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 20px', lineHeight: 1.6 }}>
              Enable the Study Planner agent in Settings to build prioritized review plans for each course folder.
            </p>
            <Link to="/settings?tab=agents" className="btn btn-accent">
              Open Settings → Agents
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar
        breadcrumb={
          <>
            <span style={{ color: 'var(--text-soft)', fontSize: 12 }}>Studio</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-faint)' }}>
              <path d="M4.5 2.5l4 3.5-4 3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 500 }}>Study planner</span>
          </>
        }
      />

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '240px 1fr', overflow: 'hidden' }}>
        {/* Saved plans sidebar */}
        <div style={{ borderRight: '1px solid var(--border)', overflowY: 'auto', background: 'var(--bg-sunken)', padding: '16px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: 10, padding: '0 4px' }}>
            Saved plans
          </div>
          {loadingPlans ? (
            <div style={{ fontSize: 12, color: 'var(--text-soft)', padding: '12px 4px' }}>Loading…</div>
          ) : savedPlans.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-soft)', padding: '12px 4px', lineHeight: 1.5 }}>
              No saved plans yet. Generate one to get started.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {savedPlans.map(plan => {
                const course = courses.find(c => c.id === plan.courseId);
                const active = plan.id === selectedPlanId;
                return (
                  <div key={plan.id} style={{
                    borderRadius: 'var(--r)',
                    border: `1px solid ${active ? 'var(--accent-soft)' : 'var(--border-subtle)'}`,
                    background: active ? 'var(--accent-soft)' : 'var(--bg-elev)',
                    overflow: 'hidden',
                  }}>
                    <button
                      type="button"
                      onClick={() => setSelectedPlanId(plan.id)}
                      style={{ width: '100%', textAlign: 'left', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 500, color: active ? 'var(--accent-text)' : 'var(--text)', lineHeight: 1.4, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {plan.title}
                      </div>
                      {course && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-soft)' }}>
                          <span style={{ width: 6, height: 6, borderRadius: 2, background: displayCourseColor(course.color), flexShrink: 0 }} />
                          {course.name}
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 3 }}>
                        {new Date(plan.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' · '}{plan.plan.planItems.length} steps
                      </div>
                    </button>
                    <div style={{ padding: '0 12px 8px' }}>
                      <button
                        type="button"
                        onClick={() => handleDelete(plan.id)}
                        disabled={deletingId === plan.id}
                        style={{ fontSize: 11, color: 'var(--bad)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: deletingId === plan.id ? 0.5 : 1 }}
                      >
                        {deletingId === plan.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Main content */}
        <div style={{ overflowY: 'auto', padding: '28px 32px' }}>
          {planReadyBanner && (
            <div style={{
              marginBottom: 20, padding: '10px 14px', borderRadius: 'var(--r)',
              background: 'var(--good-soft)', border: '1px solid var(--good)',
              color: 'var(--good)', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span><strong>Plan ready.</strong> Opened "{planReadyBanner}" below.</span>
              <button type="button" onClick={() => setPlanReadyBanner(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--good)' }}>Dismiss</button>
            </div>
          )}

          {selectedPlan ? (
            <section ref={planPanelRef} style={{ marginBottom: 32 }}>
              <StudyPlanDisplay plan={selectedPlan.plan} title={selectedPlan.title} createdAt={selectedPlan.createdAt} />
            </section>
          ) : !loadingPlans && savedPlans.length === 0 && (
            <div style={{ marginBottom: 32, padding: '24px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 'var(--r-lg)', color: 'var(--text-soft)', fontSize: 13 }}>
              Your generated study guide will appear here.
            </div>
          )}

          <StudyPlannerView onPlanGenerated={handlePlanGenerated} />
        </div>
      </div>
    </div>
  );
};

export default StudyPlannerPage;
