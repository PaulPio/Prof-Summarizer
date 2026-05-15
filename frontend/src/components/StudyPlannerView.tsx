import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { AgentService } from '../services/agentService';
import { useNavigate } from 'react-router-dom';

interface StudyPlanItem {
  lectureId: string;
  lectureTitle: string;
  reason: string;
  dueDate?: string;
}

interface StudyPlan {
  planItems: StudyPlanItem[];
  knowledgeGaps: string[];
}

const StudyPlannerView: React.FC = () => {
  const { addAgentJob, updateAgentJob } = useAppContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    const tempId = `planner-${Date.now()}`;
    addAgentJob({
      id: tempId,
      user_id: '',
      agent_type: 'study_planner',
      status: 'running',
      created_at: new Date().toISOString(),
    });

    try {
      const response = await AgentService.triggerStudyPlanner();
      updateAgentJob(response.jobId ?? tempId, { status: 'completed' });
      setPlan(response.result as StudyPlan);
    } catch (err) {
      updateAgentJob(tempId, { status: 'failed' });
      setError('Failed to generate study plan. Please try again.');
      console.error('Study planner error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-gray-900 text-lg">Study Planner</h2>
          <p className="text-sm text-gray-500 mt-0.5">AI-generated prioritized study schedule</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating…
            </>
          ) : (
            <>📅 {plan ? 'Regenerate' : 'Generate Study Plan'}</>
          )}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
      )}

      {plan && (
        <div className="space-y-6">
          {plan.planItems.length === 0 && (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-4">
              No study items generated. Try adding more lectures first.
            </p>
          )}

          {plan.planItems.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Prioritized Items</h3>
              {plan.planItems.map((item, i) => (
                <div
                  key={item.lectureId}
                  className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/lecture/${item.lectureId}`)}
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{item.lectureTitle}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.reason}</p>
                    {item.dueDate && (
                      <p className="text-xs text-indigo-600 mt-1 font-medium">
                        Due {new Date(item.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {plan.knowledgeGaps.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Knowledge Gaps to Review</h3>
              <div className="flex flex-wrap gap-2">
                {plan.knowledgeGaps.map(gap => (
                  <span
                    key={gap}
                    className="px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium"
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
