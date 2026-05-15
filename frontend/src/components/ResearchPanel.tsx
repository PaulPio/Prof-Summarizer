import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { AgentService } from '../services/agentService';

interface ResearchResource {
  title: string;
}

interface ResearchSource {
  confusionTimestamp: number;
  explanation: string;
  resources: ResearchResource[];
}

interface Props {
  lectureId: string;
  confusionMarkers: number[];
}

const ResearchPanel: React.FC<Props> = ({ lectureId, confusionMarkers }) => {
  const { addAgentJob, updateAgentJob } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<ResearchSource[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  if (confusionMarkers.length === 0) return null;

  const handleFind = async () => {
    setLoading(true);
    setError(null);
    const tempId = `research-${lectureId}-${Date.now()}`;
    addAgentJob({
      id: tempId,
      user_id: '',
      lecture_id: lectureId,
      agent_type: 'research',
      status: 'running',
      created_at: new Date().toISOString(),
    });

    try {
      const response = await AgentService.triggerResearchAgent(lectureId);
      updateAgentJob(response.jobId ?? tempId, { status: 'completed' });
      setSources(response.result?.sources ?? []);
    } catch (err) {
      updateAgentJob(tempId, { status: 'failed' });
      setError('Failed to generate study directions. Please try again.');
      console.error('Research agent error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black text-gray-800 text-sm sm:text-base">Study Directions</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {confusionMarkers.length} confusion {confusionMarkers.length === 1 ? 'marker' : 'markers'} detected
          </p>
        </div>
        {!sources && (
          <button
            onClick={handleFind}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analyzing…
              </>
            ) : (
              <>🔍 Find Resources</>
            )}
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
      )}

      {sources && sources.length === 0 && (
        <p className="text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3">
          No study directions could be generated for the detected markers.
        </p>
      )}

      {sources && sources.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 italic">
            Suggested study directions (AI-generated) — verify before use
          </p>
          {sources.map((source, i) => {
            const mins = Math.floor(source.confusionTimestamp / 60);
            const secs = String(source.confusionTimestamp % 60).padStart(2, '0');
            const isOpen = expandedIndex === i;
            return (
              <div key={i} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedIndex(isOpen ? null : i)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                      {mins}:{secs}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">Confusion marker {i + 1}</span>
                  </div>
                  <span className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                    <p className="text-sm text-gray-700 mt-3">{source.explanation}</p>
                    {source.resources.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Search suggestions</p>
                        {source.resources.map((r, j) => (
                          <div key={j} className="flex items-start gap-2 text-sm text-gray-600">
                            <span className="text-gray-400 mt-0.5 flex-shrink-0">→</span>
                            <span>{r.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <button
            onClick={() => { setSources(null); setError(null); }}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
};

export default ResearchPanel;
