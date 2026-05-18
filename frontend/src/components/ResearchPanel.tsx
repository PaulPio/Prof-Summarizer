import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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

const STORAGE_PREFIX = 'research:';

function researchStorageKey(lectureId: string) {
  return `${STORAGE_PREFIX}${lectureId}`;
}

function toSearchUrl(title: string): string {
  const cleaned = title.replace(/^search:\s*/i, '').trim();
  return `https://www.google.com/search?q=${encodeURIComponent(cleaned)}`;
}

const ResearchPanel: React.FC<Props> = ({ lectureId, confusionMarkers }) => {
  const { addAgentJob, updateAgentJob } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<ResearchSource[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(researchStorageKey(lectureId));
      if (raw) {
        const parsed = JSON.parse(raw) as ResearchSource[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSources(parsed);
        }
      }
    } catch {
      /* ignore */
    }
  }, [lectureId]);

  const persistSources = (data: ResearchSource[]) => {
    try {
      localStorage.setItem(researchStorageKey(lectureId), JSON.stringify(data));
    } catch {
      /* ignore */
    }
  };

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
      const next = (response.result?.sources ?? []) as ResearchSource[];
      updateAgentJob(response.jobId ?? tempId, { status: 'completed', result: response.result });
      setSources(next);
      persistSources(next);
      setExpandedIndex(next.length > 0 ? 0 : null);
    } catch (err) {
      updateAgentJob(tempId, { status: 'failed' });
      const message =
        err instanceof Error ? err.message : 'Failed to generate study directions. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAll = async () => {
    if (!sources?.length) return;
    const lines = sources.flatMap((s, i) => {
      const mins = Math.floor(s.confusionTimestamp / 60);
      const secs = String(s.confusionTimestamp % 60).padStart(2, '0');
      const header = `Marker ${i + 1} (${mins}:${secs})`;
      const queries = s.resources.map(r => r.title.replace(/^search:\s*/i, '').trim());
      return [header, ...queries.map(q => `  - ${q}`), ''];
    });
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy to clipboard.');
    }
  };

  const clearSaved = () => {
    localStorage.removeItem(researchStorageKey(lectureId));
    setSources(null);
    setError(null);
    setExpandedIndex(0);
  };

  if (confusionMarkers.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-amber-900 to-amber-800 px-5 py-4">
        <h3 className="font-serif text-lg text-amber-50 italic">Research assistant</h3>
        <p className="text-amber-200/90 text-sm mt-1">
          {confusionMarkers.length} confusion {confusionMarkers.length === 1 ? 'moment' : 'moments'} in this lecture
        </p>
      </div>

      <div className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-stone-500 max-w-md">
            Get AI study directions and search queries for topics you marked as confusing while recording.
          </p>
          {!sources && (
            <button
              type="button"
              onClick={handleFind}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-800 text-amber-50 rounded-xl text-xs font-semibold hover:bg-amber-900 disabled:opacity-50 transition-colors shrink-0"
            >
              {loading ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-amber-200 border-t-transparent rounded-full animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>Find study directions</>
              )}
            </button>
          )}
        </div>

        {error && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
        )}

        {sources && sources.length === 0 && (
          <p className="text-sm text-stone-500 bg-stone-50 rounded-xl border border-stone-200 px-4 py-3">
            No study directions could be generated for the detected markers.
          </p>
        )}

        {sources && sources.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-stone-400 italic">
              Suggested study directions (AI-generated) — verify before use
            </p>
            {sources.map((source, i) => {
              const mins = Math.floor(source.confusionTimestamp / 60);
              const secs = String(source.confusionTimestamp % 60).padStart(2, '0');
              const isOpen = expandedIndex === i;
              return (
                <div
                  key={i}
                  className="rounded-xl border border-stone-200 bg-stone-50/50 overflow-hidden"
                >
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-amber-50/50 transition-colors"
                    onClick={() => setExpandedIndex(isOpen ? null : i)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
                        {mins}:{secs}
                      </span>
                      <span className="text-sm font-semibold text-stone-800 truncate">
                        Confusion marker {i + 1}
                      </span>
                    </div>
                    <span className={`text-stone-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 space-y-3 border-t border-stone-200 bg-white">
                      <p className="text-sm text-stone-700 mt-3 leading-relaxed">{source.explanation}</p>
                      {source.resources.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                            Search suggestions
                          </p>
                          <ul className="space-y-2">
                            {source.resources.map((r, j) => {
                              const label = r.title.replace(/^search:\s*/i, '').trim();
                              return (
                                <li key={j}>
                                  <a
                                    href={toSearchUrl(r.title)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-start gap-2 text-sm text-amber-800 hover:text-amber-900 font-medium group"
                                  >
                                    <span className="text-stone-400 group-hover:text-amber-700 mt-0.5">↗</span>
                                    <span>{label}</span>
                                  </a>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                onClick={handleCopyAll}
                className="text-xs font-semibold text-stone-600 hover:text-amber-800"
              >
                {copied ? 'Copied!' : 'Copy all queries'}
              </button>
              <button
                type="button"
                onClick={() => {
                  clearSaved();
                  handleFind();
                }}
                disabled={loading}
                className="text-xs font-semibold text-amber-800 hover:text-amber-900 disabled:opacity-50"
              >
                Regenerate
              </button>
              <button
                type="button"
                onClick={clearSaved}
                className="text-xs text-stone-400 hover:text-stone-600"
              >
                Clear saved
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export function ResearchAssistantGate({
  lectureId,
  confusionMarkers,
}: Props) {
  const { userSettings } = useAppContext();

  if (!confusionMarkers.length) return null;

  if (!userSettings?.agentResearch) {
    return (
      <div className="p-5 bg-amber-50/80 rounded-2xl border border-amber-100 text-sm">
        <p className="font-semibold text-amber-950">Research assistant</p>
        <p className="text-amber-900/80 mt-1 text-xs leading-relaxed">
          Turn on the Research Assistant in Settings to get study directions for confusion markers in this lecture.
        </p>
        <Link
          to="/settings?tab=agents"
          className="inline-block mt-3 text-xs font-semibold text-amber-800 hover:underline"
        >
          Enable in Settings →
        </Link>
      </div>
    );
  }

  return <ResearchPanel lectureId={lectureId} confusionMarkers={confusionMarkers} />;
}

export default ResearchPanel;
