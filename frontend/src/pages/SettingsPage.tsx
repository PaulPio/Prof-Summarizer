import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AIProvider } from '../types';
import { AiModelsService, type ModelEntry } from '../services/aiModelsService';
import { SettingsService } from '../services/settingsService';
import { useAppContext } from '../context/AppContext';
import CoursesSetupPanel from '../components/CoursesSetupPanel';
import NotionConnectPanel from '../components/NotionConnectPanel';
import StudyPlannerView from '../components/StudyPlannerView';

const AI_PROVIDERS: { id: AIProvider; label: string }[] = [
  { id: 'gemini', label: 'Google Gemini' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic Claude' },
  { id: 'openrouter', label: 'OpenRouter (many models)' },
];

/** Mirrors backend `_shared/ai-provider.ts` default fallbacks where possible */
const PROVIDER_DEFAULT_MODEL: Record<AIProvider, string> = {
  gemini: 'gemini-3.0-flash-preview',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-4-6',
  openrouter: 'openai/gpt-4o-mini',
};

const MODEL_SEARCH_THRESHOLD = 25;
/** Cap DOM `<option>` count for heavy catalogs (narrow with search). */
const MAX_VISIBLE_SELECT_OPTIONS = 500;

const API_KEY_LABELS: Record<AIProvider, string> = {
  gemini: 'Gemini API Key',
  openai: 'OpenAI API Key',
  anthropic: 'Anthropic API Key',
  openrouter: 'OpenRouter API Key',
};

type Tab = 'ai' | 'courses' | 'notion' | 'agents';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, courses, fetchCourses, userSettings, setUserSettings } = useAppContext();
  const [activeTab, setActiveTab] = useState<Tab>('ai');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('gemini');
  const [selectedModel, setSelectedModel] = useState('gemini-3.0-flash-preview');
  const [apiKey, setApiKey] = useState('');
  const [debouncedApiKey, setDebouncedApiKey] = useState('');
  const [availableModels, setAvailableModels] = useState<ModelEntry[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsFetchError, setModelsFetchError] = useState('');
  const [modelsSource, setModelsSource] = useState<'live' | 'fallback' | ''>('');
  const [modelsCuratedHint, setModelsCuratedHint] = useState(false);
  const [modelsUpstreamHint, setModelsUpstreamHint] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [customModelMode, setCustomModelMode] = useState(false);
  const [reloadModelsNonce, setReloadModelsNonce] = useState(0);
  const [agentToggles, setAgentToggles] = useState({
    agentStudyPlanner: false,
    agentAutoOrganizer: false,
    agentResearch: false,
    agentMultiStep: false,
  });

  useEffect(() => {
    if (userSettings) {
      setSelectedProvider(userSettings.aiProvider);
      setSelectedModel(userSettings.aiModel);
      setAgentToggles({
        agentStudyPlanner: userSettings.agentStudyPlanner,
        agentAutoOrganizer: userSettings.agentAutoOrganizer,
        agentResearch: userSettings.agentResearch,
        agentMultiStep: userSettings.agentMultiStep,
      });
    }
  }, [userSettings]);

  useEffect(() => {
    const t = globalThis.setTimeout(() => setDebouncedApiKey(apiKey.trim()), 400);
    return () => globalThis.clearTimeout(t);
  }, [apiKey]);

  useEffect(() => {
    if (activeTab !== 'ai') return;

    let cancelled = false;
    setModelsFetchError('');
    setModelsUpstreamHint('');

    void (async () => {
      setModelsLoading(true);
      try {
        const res = await AiModelsService.listModels(
          selectedProvider,
          debouncedApiKey.trim() ? debouncedApiKey : undefined,
        );
        if (cancelled) return;
        setAvailableModels(res.models);
        setModelsSource(res.source);
        setModelsCuratedHint(Boolean(res.meta?.curated));
        setModelsUpstreamHint(res.source === 'fallback' ? (res.meta?.error ?? '') : '');
      } catch (err: unknown) {
        if (!cancelled) {
          setModelsFetchError(err instanceof Error ? err.message : 'Failed to load models');
          setModelsSource('');
          setAvailableModels([]);
        }
      } finally {
        if (!cancelled) setModelsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedProvider, debouncedApiKey, reloadModelsNonce]);

  useEffect(() => {
    if (modelsLoading || !availableModels.length || customModelMode) return;

    const listIds = new Set(availableModels.map((m) => m.id));

    setSelectedModel((prev) => {
      if (listIds.has(prev)) return prev;

      const saved =
        userSettings?.aiProvider === selectedProvider
          ? (userSettings.aiModel || '').trim()
          : '';

      if (saved) return saved;

      const def = PROVIDER_DEFAULT_MODEL[selectedProvider];
      if (listIds.has(def)) return def;

      const firstId = availableModels[0]?.id;
      return firstId ?? prev;
    });
  }, [
    modelsLoading,
    availableModels,
    selectedProvider,
    userSettings?.aiProvider,
    userSettings?.aiModel,
    customModelMode,
  ]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    const mappedTab = tab === 'canvas' ? 'courses' : tab;
    if (mappedTab === 'courses' || mappedTab === 'notion' || mappedTab === 'ai' || mappedTab === 'agents') {
      setActiveTab(mappedTab);
    }
    const notionStatus = searchParams.get('notion');
    if (notionStatus === 'connected') {
      setSaveSuccess(true);
      SettingsService.getSettings().then(setUserSettings).catch(() => {});
      const next = new URLSearchParams(searchParams);
      next.delete('notion');
      next.delete('message');
      setSearchParams(next, { replace: true });
    } else if (notionStatus === 'error') {
      setSaveError('Notion connection failed. Please try again.');
      const next = new URLSearchParams(searchParams);
      next.delete('notion');
      next.delete('message');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, setUserSettings]);

  if (!user || user.id === 'guest') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm px-4">
          <div className="text-5xl">🔒</div>
          <h2 className="text-2xl font-black text-gray-900">Sign In Required</h2>
          <p className="text-gray-500 text-sm">Settings are only available for signed-in users. API keys, agent configuration, and integrations require an account.</p>
          <button onClick={() => navigate('/')} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors">Back Home</button>
        </div>
      </div>
    );
  }

  const normalizedSearch = modelSearch.trim().toLowerCase();
  const filteredModels =
    normalizedSearch === ''
      ? availableModels
      : availableModels.filter((m) => {
          const hay = `${m.id} ${m.label ?? ''}`.toLowerCase();
          return hay.includes(normalizedSearch);
        });

  const selectedInFiltered = filteredModels.some((m) => m.id === selectedModel);
  const showModelSearch =
    selectedProvider === 'openrouter' || availableModels.length > MODEL_SEARCH_THRESHOLD;

  const hasKeyLabel = (): string => {
    if (!userSettings) return '';
    const map: Record<AIProvider, boolean> = {
      gemini: userSettings.hasGeminiKey,
      openai: userSettings.hasOpenAIKey,
      anthropic: userSettings.hasAnthropicKey,
      openrouter: userSettings.hasOpenRouterKey,
    };
    return map[selectedProvider] ? '(key saved)' : '';
  };

  const handleSaveAI = async () => {
    setIsSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      const patch: Record<string, any> = {
        aiProvider: selectedProvider,
        aiModel: selectedModel,
      };
      const keyField: Record<AIProvider, string> = {
        gemini: 'geminiApiKey',
        openai: 'openaiApiKey',
        anthropic: 'anthropicApiKey',
        openrouter: 'openrouterApiKey',
      };
      if (apiKey.trim()) {
        patch[keyField[selectedProvider]] = apiKey.trim();
      }
      await SettingsService.updateSettings(patch);
      const updated = await SettingsService.getSettings();
      setUserSettings(updated);
      setApiKey('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAgents = async () => {
    setIsSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      await SettingsService.updateSettings(agentToggles);
      const updated = await SettingsService.getSettings();
      setUserSettings(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-12 relative">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-2xl font-black text-gray-900">Settings</h1>
        </div>

        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
          {([['ai', 'AI'], ['courses', 'Courses'], ['notion', 'Notion'], ['agents', 'Agents']] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${activeTab === id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {saveError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{saveError}</div>
        )}
        {saveSuccess && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium">Settings saved.</div>
        )}

        {activeTab === 'ai' && (
          <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-black text-gray-900">AI Provider</h2>

            <div className="space-y-3">
              <div className="block text-xs font-bold text-gray-600 uppercase tracking-wider">Provider</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AI_PROVIDERS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedProvider(p.id);
                      setApiKey('');
                      setModelSearch('');
                      setCustomModelMode(false);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${selectedProvider === p.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${selectedProvider === p.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`} />
                    <span className="text-sm font-semibold text-gray-900">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="block text-xs font-bold text-gray-600 uppercase tracking-wider">Model</div>
                {modelsLoading && (
                  <span className="text-xs text-gray-400">Loading catalog…</span>
                )}
              </div>

              {modelsFetchError && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs">
                  <span className="flex-1">{modelsFetchError}</span>
                  <button
                    type="button"
                    onClick={() => setReloadModelsNonce(n => n + 1)}
                    className="px-3 py-1.5 rounded-lg bg-amber-100 font-bold text-amber-900 hover:bg-amber-200"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!modelsFetchError && modelsSource && (
                <div className="text-xs text-gray-500 space-y-0.5">
                  {modelsSource === 'live' && (
                    <p className="text-green-700 font-medium">
                      Live catalog ({availableModels.length} models)
                    </p>
                  )}
                  {modelsSource === 'fallback' && (
                    <p className="text-amber-800">
                      Showing cached suggestions
                      {modelsUpstreamHint ? ` — ${modelsUpstreamHint}` : ''}
                    </p>
                  )}
                  {modelsCuratedHint && (
                    <p>Claude model IDs are curated (Anthropic does not expose a public listing API).</p>
                  )}
                  {(selectedProvider === 'gemini' || selectedProvider === 'openai') && !debouncedApiKey && (
                    <p>
                      Paste your {API_KEY_LABELS[selectedProvider].replace(' API Key', '')} key above to load the full live model list.
                    </p>
                  )}
                </div>
              )}

              <label htmlFor="settings-custom-model-toggle" className="flex items-center gap-2 text-sm text-gray-700 select-none cursor-pointer">
                <input
                  id="settings-custom-model-toggle"
                  type="checkbox"
                  className="rounded border-gray-300"
                  checked={customModelMode}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setCustomModelMode(on);
                    if (!on) {
                      const listIds = new Set(availableModels.map((m) => m.id));
                      setSelectedModel((prev) => {
                        if (listIds.has(prev)) return prev;
                        const def = PROVIDER_DEFAULT_MODEL[selectedProvider];
                        if (listIds.has(def)) return def;
                        return availableModels[0]?.id ?? prev;
                      });
                    }
                  }}
                />
                <span>Enter a custom model ID</span>
              </label>

              {customModelMode ? (
                <input
                  type="text"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  placeholder={selectedProvider === 'openrouter' ? 'e.g. anthropic/claude-3.5-sonnet' : 'Model id'}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              ) : (
                <>
                  {showModelSearch && (
                    <input
                      type="search"
                      value={modelSearch}
                      onChange={(e) => setModelSearch(e.target.value)}
                      placeholder="Search models…"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    disabled={modelsLoading || !availableModels.length}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    {!selectedInFiltered && selectedModel.trim() && (
                      <option value={selectedModel}>
                        {`${selectedModel} (refine search if you expected a catalog match)`}
                      </option>
                    )}
                    {filteredModels.slice(0, MAX_VISIBLE_SELECT_OPTIONS).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label ? `${m.label} — ${m.id}` : m.id}
                      </option>
                    ))}
                  </select>
                  {filteredModels.length > MAX_VISIBLE_SELECT_OPTIONS && (
                    <p className="text-xs text-gray-400">
                      Showing first {MAX_VISIBLE_SELECT_OPTIONS} matches — refine search to narrow results.
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                {API_KEY_LABELS[selectedProvider]} {hasKeyLabel() && <span className="normal-case font-normal text-green-600">{hasKeyLabel()}</span>}
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={hasKeyLabel() ? 'Enter new key to replace…' : 'Paste your API key…'}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <p className="text-xs text-gray-400">Leave blank to keep the existing key. Keys are encrypted before storage.</p>
            </div>

            <button
              onClick={handleSaveAI}
              disabled={isSaving}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSaving ? 'Saving…' : 'Save AI Settings'}
            </button>
          </div>
        )}

        {activeTab === 'courses' && (
          <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-black text-gray-900">Courses & syllabi</h2>
            <CoursesSetupPanel userId={user.id} courses={courses} onCoursesChanged={fetchCourses} />
          </div>
        )}

        {activeTab === 'notion' && (
          <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-black text-gray-900">Notion Integration</h2>
            <NotionConnectPanel
              userSettings={userSettings}
              onSettingsChange={setUserSettings}
            />
          </div>
        )}

        {activeTab === 'agents' && (
          <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-black text-gray-900">AI Agents</h2>
            <p className="text-sm text-gray-500">Agents run automatically or on-demand to help organize and study your lectures.</p>

            <div className="space-y-4">
              {[
                { key: 'agentAutoOrganizer', label: 'Auto-Organizer', desc: 'Automatically suggests which course a lecture belongs to after saving.' },
                { key: 'agentStudyPlanner', label: 'Study Planner', desc: 'Build a prioritized plan for one course folder — you choose lectures and which materials to include.' },
                { key: 'agentResearch', label: 'Research Assistant', desc: 'Finds study directions for topics you marked as confusing during recording.' },
                { key: 'agentMultiStep', label: 'Multi-Step Pipeline', desc: 'Runs a configurable sequence of actions (summarize → flashcards → export) automatically after each lecture.' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-start justify-between gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900">{label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                  <button
                    onClick={() => setAgentToggles(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${agentToggles[key as keyof typeof agentToggles] ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${agentToggles[key as keyof typeof agentToggles] ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleSaveAgents}
              disabled={isSaving}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSaving ? 'Saving…' : 'Save Agent Settings'}
            </button>

            {agentToggles.agentStudyPlanner && (
              <div className="pt-2 border-t border-gray-100">
                <StudyPlannerView />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
