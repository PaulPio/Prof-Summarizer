import React from 'react';
import { useAppContext } from '../context/AppContext';

const AgentJobStatusBar: React.FC = () => {
  const { agentJobs, dismissAgentJob } = useAppContext();
  const visible = agentJobs.filter(j => j.status === 'running' || j.status === 'completed' || j.status === 'failed');

  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 px-3 py-2">
      {visible.map(job => (
        <div
          key={job.id}
          className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-stone-100 text-xs text-stone-700"
        >
          <div className="flex items-center gap-2 min-w-0">
            {job.status === 'running' && (
              <span className="inline-block w-3 h-3 border-2 border-amber-800 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            )}
            {job.status === 'completed' && (
              <span className="text-green-500 flex-shrink-0">✓</span>
            )}
            {job.status === 'failed' && (
              <span className="text-red-500 flex-shrink-0">✕</span>
            )}
            <span className="truncate">{labelFor(job)}</span>
          </div>
          {job.status !== 'running' && (
            <button
              onClick={() => dismissAgentJob(job.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 leading-none"
              aria-label="Dismiss"
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

function labelFor(job: { agent_type: string; status: string }): string {
  if (job.status === 'completed') {
    switch (job.agent_type) {
      case 'auto_organizer': return 'Lecture organized';
      case 'study_planner': return 'Study plan ready';
      case 'research': return 'Research ready';
      case 'pipeline': return 'Study materials ready';
      default: return 'Done';
    }
  }
  if (job.status === 'failed') {
    switch (job.agent_type) {
      case 'study_planner': return 'Study plan failed';
      default: return 'Agent failed';
    }
  }
  switch (job.agent_type) {
    case 'auto_organizer': return 'Auto-organizing lecture…';
    case 'study_planner': return 'Generating study plan…';
    case 'research': return 'Finding study directions…';
    case 'pipeline': return 'Building study materials…';
    default: return 'Agent running…';
  }
}

export default AgentJobStatusBar;
