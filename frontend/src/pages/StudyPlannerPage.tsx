import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import StudyPlannerView from '../components/StudyPlannerView';
import StudyPlanDisplay from '../components/StudyPlanDisplay';
import { StorageService } from '../services/storageService';
import { displayCourseColor } from '../constants/courseColors';
import type { SavedStudyPlan } from '../types';

const StudyPlannerPage: React.FC = () => {
  const { user, userSettings, courses } = useAppContext();
  const [savedPlans, setSavedPlans] = useState<SavedStudyPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const selectedPlan = savedPlans.find(p => p.id === selectedPlanId) ?? null;

  const handlePlanGenerated = (plan: SavedStudyPlan) => {
    setSavedPlans(prev => {
      const without = prev.filter(p => p.id !== plan.id);
      return [plan, ...without];
    });
    setSelectedPlanId(plan.id);
  };

  const handleDelete = async (planId: string) => {
    if (!user) return;
    if (!confirm('Delete this study plan? This cannot be undone.')) return;
    setDeletingId(planId);
    try {
      await StorageService.deleteStudyPlan(user.id, planId);
      setSavedPlans(prev => {
        const next = prev.filter(p => p.id !== planId);
        if (selectedPlanId === planId) {
          setSelectedPlanId(next[0]?.id ?? null);
        }
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
      <div className="max-w-lg mx-auto p-6 sm:p-12">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Study planner</p>
        <h1 className="font-serif text-3xl text-stone-900 mt-2">Turn on the study planner</h1>
        <p className="text-stone-600 mt-3 text-sm leading-relaxed">
          Enable the Study Planner agent in Settings to build prioritized review plans for each course folder.
        </p>
        <Link
          to="/settings?tab=agents"
          className="inline-flex mt-6 px-5 py-2.5 bg-amber-800 text-amber-50 rounded-xl text-sm font-semibold hover:bg-amber-900"
        >
          Open Settings → Agents
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-10 space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Study planner</p>
        <h1 className="font-serif text-3xl sm:text-4xl text-stone-900 mt-1">Your study plans</h1>
        <p className="text-sm text-stone-600 mt-2 max-w-2xl">
          Saved plans for one course at a time. Generate a new plan below or open a saved one from the list.
        </p>
      </header>

      <div className="grid lg:grid-cols-[minmax(240px,280px)_1fr] gap-6 items-start">
        <aside className="space-y-3 lg:sticky lg:top-4">
          <h2 className="text-sm font-bold text-stone-800">Saved plans</h2>
          {loadingPlans ? (
            <p className="text-sm text-stone-400 py-4">Loading…</p>
          ) : savedPlans.length === 0 ? (
            <p className="text-sm text-stone-500 bg-white rounded-xl border border-stone-200 p-4">
              No saved plans yet. Generate your first plan below.
            </p>
          ) : (
            <ul className="space-y-2">
              {savedPlans.map(plan => {
                const course = courses.find(c => c.id === plan.courseId);
                const active = plan.id === selectedPlanId;
                return (
                  <li key={plan.id}>
                    <div
                      className={`rounded-xl border transition-colors ${
                        active
                          ? 'bg-amber-50 border-amber-200 shadow-sm'
                          : 'bg-white border-stone-200 hover:border-amber-100'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedPlanId(plan.id)}
                        className="w-full text-left p-3 pr-2"
                      >
                        <p className="text-sm font-semibold text-stone-900 line-clamp-2">{plan.title}</p>
                        {course && (
                          <p className="text-xs text-stone-500 mt-1 flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: displayCourseColor(course.color) }}
                            />
                            {course.name}
                          </p>
                        )}
                        <p className="text-[10px] text-stone-400 mt-1">
                          {new Date(plan.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                          {' · '}
                          {plan.plan.planItems.length} steps
                        </p>
                      </button>
                      <div className="px-3 pb-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleDelete(plan.id)}
                          disabled={deletingId === plan.id}
                          className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          {deletingId === plan.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <div className="space-y-6 min-w-0">
          {selectedPlan && (
            <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-sm">
              <StudyPlanDisplay plan={selectedPlan.plan} title={selectedPlan.title} />
            </section>
          )}

          <StudyPlannerView onPlanGenerated={handlePlanGenerated} />
        </div>
      </div>
    </div>
  );
};

export default StudyPlannerPage;
