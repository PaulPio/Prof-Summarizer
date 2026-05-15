import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AIProvider, UserSettings } from '../types';
import { SettingsService } from '../services/settingsService';
import { useAppContext } from '../context/AppContext';
import CanvasMaterialBrowser from '../components/CanvasMaterialBrowser';

const AI_PROVIDERS: { id: AIProvider; label: string; models: string[] }[] = [
  { id: 'gemini', label: 'Google Gemini', models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro'] },
  { id: 'openai', label: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
  { id: 'anthropic', label: 'Anthropic Claude', models: ['claude-sonnet-4-6', 'claude-haiku-4-5-20251001', 'claude-opus-4-7'] },
  { id: 'openrouter', label: 'OpenRouter (any model)', models: ['openai/gpt-4o', 'openai/gpt-4o-mini', 'meta-llama/llama-3.3-70b-instruct', 'google/gemini-2.0-flash-001', 'mistralai/mixtral-8x7b-instruct'] },
];

const API_KEY_LABELS: Record<AIProvider, string> = {
  gemini: 'Gemini API Key',
  openai: 'OpenAI API Key',
  anthropic: 'Anthropic API Key',
  openrouter: 'OpenRouter API Key',
};

type Tab = 'ai' | 'canvas' | 'agents';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, userSettings, setUserSettings } = useAppContext();
  const [activeTab, setActiveTab] = useState<Tab>('ai');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showCanvasBrowser, setShowCanvasBrowser] = useState(false);
  const [canvasInstanceUrl, setCanvasInstanceUrl] = useState('');
  const [canvasToken, setCanvasToken] = useState('');

  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('gemini');
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const [apiKey, setApiKey] = useState('');
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
      setCanvasInstanceUrl(userSettings.canvasInstanceUrl || '');
      setAgentToggles({
        agentStudyPlanner: userSettings.agentStudyPlanner,
        agentAutoOrganizer: userSettings.agentAutoOrganizer,
        agentResearch: userSettings.agentResearch,
        agentMultiStep: userSettings.agentMultiStep,
      });
    }
  }, [userSettings]);

  if (user?.id === 'guest') {
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

  const providerConfig = AI_PROVIDERS.find(p => p.id === selectedProvider);

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

  const handleSaveCanvas = async () => {
    setIsSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      const patch: Record<string, any> = { canvasInstanceUrl };
      if (canvasToken.trim()) patch['canvasApiToken'] = canvasToken.trim();
      await SettingsService.updateSettings(patch);
      const updated = await SettingsService.getSettings();
      setUserSettings(updated);
      setCanvasToken('');
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

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {([['ai', 'AI Provider'], ['canvas', 'Canvas'], ['agents', 'Agents']] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-colors ${activeTab === id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
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
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">Provider</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AI_PROVIDERS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedProvider(p.id); setSelectedModel(p.models[0]); setApiKey(''); }}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${selectedProvider === p.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${selectedProvider === p.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`} />
                    <span className="text-sm font-semibold text-gray-900">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">Model</label>
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {providerConfig?.models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
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

        {activeTab === 'canvas' && (
          <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-black text-gray-900">Canvas LMS</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Canvas Instance URL</label>
                <input
                  type="url"
                  value={canvasInstanceUrl}
                  onChange={e => setCanvasInstanceUrl(e.target.value)}
                  placeholder="https://canvas.youruniversity.edu"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  API Token {userSettings?.hasCanvasToken && <span className="normal-case font-normal text-green-600">(token saved)</span>}
                </label>
                <input
                  type="password"
                  value={canvasToken}
                  onChange={e => setCanvasToken(e.target.value)}
                  placeholder={userSettings?.hasCanvasToken ? 'Enter new token to replace…' : 'Paste your Canvas API token…'}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">Get your token from Canvas → Account → Settings → Approved Integrations → New Access Token.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSaveCanvas}
                disabled={isSaving}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? 'Saving…' : 'Save Canvas Settings'}
              </button>
              {userSettings?.hasCanvasToken && (
                <button
                  onClick={() => setShowCanvasBrowser(true)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors"
                >
                  Browse Materials
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'agents' && (
          <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-black text-gray-900">AI Agents</h2>
            <p className="text-sm text-gray-500">Agents run automatically or on-demand to help organize and study your lectures.</p>

            <div className="space-y-4">
              {[
                { key: 'agentAutoOrganizer', label: 'Auto-Organizer', desc: 'Automatically suggests which course a lecture belongs to after saving.' },
                { key: 'agentStudyPlanner', label: 'Study Planner', desc: 'Generates a prioritized study schedule based on your lecture history and quiz performance.' },
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
          </div>
        )}
      </div>

      {showCanvasBrowser && (
        <CanvasMaterialBrowser
          onImport={() => {}}
          onClose={() => setShowCanvasBrowser(false)}
        />
      )}
    </div>
  );
};

export default SettingsPage;
