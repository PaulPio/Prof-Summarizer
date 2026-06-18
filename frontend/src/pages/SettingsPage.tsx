import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AIProvider } from '../types';
import { AiModelsService, type ModelEntry } from '../services/aiModelsService';
import { SettingsService } from '../services/settingsService';
import { useAppContext } from '../context/AppContext';
import CoursesSetupPanel from '../components/CoursesSetupPanel';
import NotionConnectPanel from '../components/NotionConnectPanel';
import TopBar from '../components/TopBar';
import { STUDY_PLANNER_ENABLED } from '../constants/featureFlags';
import { GuestSettingsService } from '../services/guestSettingsService';

const AI_PROVIDERS: { id: AIProvider; label: string }[] = [
  { id: 'gemini', label: 'Google Gemini' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic Claude' },
  { id: 'openrouter', label: 'OpenRouter (many models)' },
];

const PROVIDER_DEFAULT_MODEL: Record<AIProvider, string> = {
  gemini: 'gemini-3.0-flash-preview',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-4-6',
  openrouter: 'openai/gpt-4o-mini',
};

const MODEL_SEARCH_THRESHOLD = 25;
const MAX_VISIBLE_SELECT_OPTIONS = 500;

const API_KEY_LABELS: Record<AIProvider, string> = {
  gemini: 'Gemini API Key',
  openai: 'OpenAI API Key',
  anthropic: 'Anthropic API Key',
  openrouter: 'OpenRouter API Key',
};

type Section =
  | 'account' | 'appearance' | 'keyboard'
  | 'ai' | 'agents' | 'pipeline'
  | 'courses' | 'notion' | 'export'
  | 'audio' | 'flags'
  | 'data' | 'danger';

const SECTION_LABELS: Record<Section, string> = {
  account: 'Account',
  appearance: 'Appearance',
  keyboard: 'Keyboard shortcuts',
  ai: 'AI provider',
  agents: 'Agents',
  pipeline: 'Post-capture pipeline',
  courses: 'Courses & syllabi',
  notion: 'Notion',
  export: 'Export',
  audio: 'Audio & capture',
  flags: 'Confusion flags',
  data: 'Data & storage',
  danger: 'Danger zone',
};

interface NavGroup { label: string; items: Section[] }

const NAV_GROUPS: NavGroup[] = [
  { label: 'You', items: ['account', 'appearance', 'keyboard'] },
  { label: 'Intelligence', items: ['ai', 'agents', 'pipeline'] },
  { label: 'Library', items: ['courses', 'notion', 'export'] },
  { label: 'Capture', items: ['audio', 'flags'] },
  { label: 'Advanced', items: ['data', 'danger'] },
];

const GUEST_SECTIONS: Section[] = ['account', 'appearance', 'keyboard', 'ai', 'courses', 'audio', 'flags', 'data'];

interface SettingsPageProps {
  onLogout: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, courses, fetchCourses, userSettings, setUserSettings } = useAppContext();
  const isGuest = user?.id === 'guest';
  const navGroups = isGuest
    ? NAV_GROUPS
        .map(g => ({ ...g, items: g.items.filter(i => GUEST_SECTIONS.includes(i)) }))
        .filter(g => g.items.length > 0)
    : NAV_GROUPS;
  const [activeSection, setActiveSection] = useState<Section>('ai');
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

  // Appearance state (UI only, no backend)
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [density, setDensity] = useState<'compact' | 'cozy'>('compact');

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
    if (activeSection !== 'ai') return;
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
    return () => { cancelled = true; };
  }, [activeSection, selectedProvider, debouncedApiKey, reloadModelsNonce]);

  useEffect(() => {
    if (modelsLoading || !availableModels.length || customModelMode) return;
    const listIds = new Set(availableModels.map((m) => m.id));
    setSelectedModel((prev) => {
      if (listIds.has(prev)) return prev;
      const saved = userSettings?.aiProvider === selectedProvider ? (userSettings.aiModel || '').trim() : '';
      if (saved) return saved;
      const def = PROVIDER_DEFAULT_MODEL[selectedProvider];
      if (listIds.has(def)) return def;
      return availableModels[0]?.id ?? prev;
    });
  }, [modelsLoading, availableModels, selectedProvider, userSettings?.aiProvider, userSettings?.aiModel, customModelMode]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    const mappedTab = tab === 'canvas' ? 'courses' : tab;
    if (mappedTab === 'courses' || mappedTab === 'notion' || mappedTab === 'ai' || mappedTab === 'agents') {
      setActiveSection(mappedTab as Section);
    }
    const notionStatus = searchParams.get('notion');
    if (notionStatus === 'connected') {
      setSaveSuccess(true);
      SettingsService.getSettings().then(setUserSettings).catch(() => {});
      const next = new URLSearchParams(searchParams);
      next.delete('notion'); next.delete('message');
      setSearchParams(next, { replace: true });
    } else if (notionStatus === 'error') {
      setSaveError('Notion connection failed. Please try again.');
      const next = new URLSearchParams(searchParams);
      next.delete('notion'); next.delete('message');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, setUserSettings]);

  // Apply density token
  useEffect(() => {
    if (density === 'cozy') {
      document.documentElement.setAttribute('data-density', 'cozy');
    } else {
      document.documentElement.removeAttribute('data-density');
    }
  }, [density]);

  // Apply theme token
  useEffect(() => {
    const effective = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    if (effective === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [theme]);

  if (!user) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 360, padding: '0 24px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Sign in or continue as guest to open Settings.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>Back home</button>
        </div>
      </div>
    );
  }

  const normalizedSearch = modelSearch.trim().toLowerCase();
  const filteredModels = normalizedSearch === ''
    ? availableModels
    : availableModels.filter(m => `${m.id} ${m.label ?? ''}`.toLowerCase().includes(normalizedSearch));
  const selectedInFiltered = filteredModels.some(m => m.id === selectedModel);
  const showModelSearch = selectedProvider === 'openrouter' || availableModels.length > MODEL_SEARCH_THRESHOLD;

  const hasKeyLabel = () => {
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
    setIsSaving(true); setSaveError(''); setSaveSuccess(false);
    try {
      if (isGuest) {
        if (!apiKey.trim() && !hasKeyLabel()) {
          setSaveError('Add an API key for your selected provider before saving.');
          return;
        }
        const raw = GuestSettingsService.save({
          aiProvider: selectedProvider,
          aiModel: selectedModel,
          apiKey: apiKey.trim() || undefined,
          providerForKey: selectedProvider,
        });
        setUserSettings(GuestSettingsService.toUserSettings(raw));
        setApiKey('');
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        return;
      }
      const patch: Record<string, unknown> = { aiProvider: selectedProvider, aiModel: selectedModel };
      const keyField: Record<AIProvider, string> = { gemini: 'geminiApiKey', openai: 'openaiApiKey', anthropic: 'anthropicApiKey', openrouter: 'openrouterApiKey' };
      if (apiKey.trim()) patch[keyField[selectedProvider]] = apiKey.trim();
      await SettingsService.updateSettings(patch);
      const updated = await SettingsService.getSettings();
      setUserSettings(updated);
      setApiKey('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally { setIsSaving(false); }
  };

  const handleSaveAgents = async () => {
    setIsSaving(true); setSaveError(''); setSaveSuccess(false);
    try {
      await SettingsService.updateSettings(agentToggles);
      const updated = await SettingsService.getSettings();
      setUserSettings(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally { setIsSaving(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-sm)',
    padding: '7px 10px',
    background: 'var(--bg)',
    color: 'var(--text)',
    fontSize: 13,
    outline: 'none',
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar
        breadcrumb={
          <>
            <button className="btn btn-ghost" style={{ padding: '3px 6px' }} onClick={() => navigate('/')}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M7.5 2L3 6l4.5 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span style={{ color: 'var(--text-soft)', fontSize: 12 }}>Settings</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-faint)' }}>
              <path d="M4.5 2.5l4 3.5-4 3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 500 }}>{SECTION_LABELS[activeSection]}</span>
          </>
        }
      />

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '220px 1fr', overflow: 'hidden' }}>
        {/* Left nav rail */}
        <div style={{ borderRight: '1px solid var(--border)', background: 'var(--bg)', overflowY: 'auto', padding: '12px 8px' }}>
          {navGroups.map(group => (
            <div key={group.label} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-soft)', padding: '4px 8px 6px' }}>
                {group.label}
              </div>
              {group.items.map(section => (
                <button
                  key={section}
                  type="button"
                  onClick={() => setActiveSection(section)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    borderRadius: 'var(--r-sm)',
                    background: activeSection === section ? 'var(--bg-sunken)' : 'transparent',
                    border: 'none',
                    color: activeSection === section ? 'var(--text)' : 'var(--text-muted)',
                    fontSize: 13,
                    fontWeight: activeSection === section ? 500 : 400,
                    cursor: 'pointer',
                    textAlign: 'left',
                    marginBottom: 1,
                  }}
                  onMouseEnter={e => { if (activeSection !== section) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { if (activeSection !== section) e.currentTarget.style.background = 'transparent'; }}
                >
                  {SECTION_LABELS[section]}
                  {section === 'ai' && userSettings?.aiProvider && (
                    <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: 'var(--good)', flexShrink: 0 }} />
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Right content */}
        <div style={{ overflowY: 'auto', padding: '32px 36px' }}>
          <div style={{ maxWidth: 680 }}>
            {(saveError || saveSuccess) && (
              <div style={{
                marginBottom: 20,
                padding: '10px 14px',
                borderRadius: 'var(--r)',
                background: saveError ? 'var(--bad-soft)' : 'var(--good-soft)',
                border: `1px solid ${saveError ? 'var(--bad)' : 'var(--good)'}`,
                color: saveError ? 'var(--bad)' : 'var(--good)',
                fontSize: 13,
              }}>
                {saveError || 'Settings saved.'}
              </div>
            )}

            {/* Account */}
            {activeSection === 'account' && (
              <SectionContent title="Account">
                <Row label="Name" value={user.name} />
                <Row label="Email" value={user.email ?? '—'} />
                <div style={{ marginTop: 20 }}>
                  <button className="btn" style={{ color: 'var(--bad)', borderColor: 'var(--bad-soft)' }} onClick={onLogout}>
                    Sign out
                  </button>
                </div>
              </SectionContent>
            )}

            {/* Appearance */}
            {activeSection === 'appearance' && (
              <SectionContent title="Appearance">
                <SettingBlock label="Theme">
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['light', 'dark', 'system'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        className="btn"
                        style={{ background: theme === t ? 'var(--text)' : undefined, color: theme === t ? 'var(--bg)' : undefined, borderColor: theme === t ? 'var(--text)' : undefined }}
                        onClick={() => setTheme(t)}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </SettingBlock>
                <SettingBlock label="Density">
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['compact', 'cozy'] as const).map(d => (
                      <button
                        key={d}
                        type="button"
                        className="btn"
                        style={{ background: density === d ? 'var(--text)' : undefined, color: density === d ? 'var(--bg)' : undefined, borderColor: density === d ? 'var(--text)' : undefined }}
                        onClick={() => setDensity(d)}
                      >
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </button>
                    ))}
                  </div>
                </SettingBlock>
              </SectionContent>
            )}

            {/* Keyboard */}
            {activeSection === 'keyboard' && (
              <SectionContent title="Keyboard shortcuts">
                <ShortcutsTable />
              </SectionContent>
            )}

            {/* AI Provider */}
            {activeSection === 'ai' && (
              <SectionContent title="AI provider">
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
                  ProfSummarizer uses your own API key (BYOK). Choose a provider, pick a model, and add your key before recording or generating study materials.
                </p>
                <SettingBlock label="Provider">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {AI_PROVIDERS.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setSelectedProvider(p.id); setApiKey(''); setModelSearch(''); setCustomModelMode(false); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 12px', borderRadius: 'var(--r)',
                          border: `2px solid ${selectedProvider === p.id ? 'var(--accent)' : 'var(--border)'}`,
                          background: selectedProvider === p.id ? 'var(--accent-soft)' : 'var(--bg)',
                          cursor: 'pointer', textAlign: 'left',
                        }}
                      >
                        <span style={{
                          width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                          border: `2px solid ${selectedProvider === p.id ? 'var(--accent)' : 'var(--border)'}`,
                          background: selectedProvider === p.id ? 'var(--accent)' : 'transparent',
                        }} />
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{p.label}</span>
                      </button>
                    ))}
                  </div>
                </SettingBlock>

                <SettingBlock label="Model">
                  {modelsFetchError && (
                    <div style={{ padding: '8px 12px', borderRadius: 'var(--r-sm)', background: 'var(--confuse-soft)', border: '1px solid var(--confuse)', color: 'var(--confuse)', fontSize: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span>{modelsFetchError}</span>
                      <button type="button" className="btn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => setReloadModelsNonce(n => n + 1)}>Retry</button>
                    </div>
                  )}
                  {!modelsFetchError && modelsSource && (
                    <div style={{ fontSize: 11, color: modelsSource === 'live' ? 'var(--good)' : 'var(--confuse)', marginBottom: 6 }}>
                      {modelsSource === 'live' ? `Live catalog · ${availableModels.length} models` : `Cached suggestions${modelsUpstreamHint ? ` — ${modelsUpstreamHint}` : ''}`}
                      {modelsCuratedHint && ' · Curated list'}
                    </div>
                  )}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={customModelMode} onChange={e => setCustomModelMode(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
                    Enter a custom model ID
                  </label>
                  {customModelMode ? (
                    <input type="text" value={selectedModel} onChange={e => setSelectedModel(e.target.value)} placeholder="Model ID" style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
                  ) : (
                    <>
                      {showModelSearch && (
                        <input type="search" value={modelSearch} onChange={e => setModelSearch(e.target.value)} placeholder="Search models…" style={{ ...inputStyle, marginBottom: 6 }} />
                      )}
                      <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} disabled={modelsLoading || !availableModels.length} style={{ ...inputStyle, cursor: 'pointer' }}>
                        {!selectedInFiltered && selectedModel.trim() && (
                          <option value={selectedModel}>{selectedModel} (current)</option>
                        )}
                        {filteredModels.slice(0, MAX_VISIBLE_SELECT_OPTIONS).map(m => (
                          <option key={m.id} value={m.id}>{m.label ? `${m.label} — ${m.id}` : m.id}</option>
                        ))}
                      </select>
                      {modelsLoading && <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 4 }}>Loading catalog…</div>}
                    </>
                  )}
                </SettingBlock>

                <SettingBlock label={`${API_KEY_LABELS[selectedProvider]}${hasKeyLabel() ? ' (key saved)' : ''}`}>
                  <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={hasKeyLabel() ? 'Enter new key to replace…' : 'Paste your API key…'} style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
                  <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 4 }}>
                    {isGuest
                      ? 'Stored locally in your browser only. Never shared except with your chosen AI provider when you transcribe or study.'
                      : 'Leave blank to keep existing key. Keys are encrypted before storage.'}
                  </div>
                </SettingBlock>

                <button className="btn btn-accent" onClick={handleSaveAI} disabled={isSaving} style={{ marginTop: 8 }}>
                  {isSaving ? 'Saving…' : 'Save AI settings'}
                </button>
              </SectionContent>
            )}

            {/* Agents */}
            {activeSection === 'agents' && (
              <SectionContent title="AI agents">
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
                  Agents run automatically or on-demand to help organize and study your lectures.
                </p>
                {([
                  { key: 'agentAutoOrganizer', label: 'Auto-Organizer', desc: 'Suggests which course a lecture belongs to after saving.' },
                  ...(STUDY_PLANNER_ENABLED ? [{ key: 'agentStudyPlanner' as const, label: 'Study Planner', desc: 'Builds a prioritized plan for a course folder.' }] : []),
                  { key: 'agentResearch', label: 'Research Assistant', desc: 'Finds study directions for topics marked confusing during recording.' },
                  { key: 'agentMultiStep', label: 'Multi-Step Pipeline', desc: 'Runs a configurable sequence of actions after each lecture.' },
                ] as const).map(({ key, label, desc }) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>{desc}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAgentToggles(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                      style={{
                        position: 'relative', width: 40, height: 22, borderRadius: 999,
                        background: agentToggles[key as keyof typeof agentToggles] ? 'var(--accent)' : 'var(--border-strong)',
                        border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'background 150ms',
                      }}
                    >
                      <span style={{
                        position: 'absolute', top: 3, left: agentToggles[key as keyof typeof agentToggles] ? 21 : 3,
                        width: 16, height: 16, borderRadius: '50%', background: 'white',
                        transition: 'left 150ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }} />
                    </button>
                  </div>
                ))}
                <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
                  <button className="btn btn-accent" onClick={handleSaveAgents} disabled={isSaving}>
                    {isSaving ? 'Saving…' : 'Save agent settings'}
                  </button>
                  {STUDY_PLANNER_ENABLED && agentToggles.agentStudyPlanner && (
                    <button className="btn" type="button" onClick={() => navigate('/planner')}>Open Study planner →</button>
                  )}
                </div>
              </SectionContent>
            )}

            {/* Post-capture pipeline */}
            {activeSection === 'pipeline' && (
              <SectionContent title="Post-capture pipeline">
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
                  These steps run automatically after each recording or upload. Drag to reorder.
                </p>
                {[
                  { label: 'Transcribe', locked: true },
                  { label: 'Cornell notes', locked: false },
                  { label: 'Flashcards', locked: false },
                  { label: 'Quiz', locked: false },
                  { label: 'Research suggestions', locked: false },
                  { label: 'Auto-organize', locked: false },
                  { label: 'Push to Notion', locked: false },
                ].map((step, i) => (
                  <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-soft)', width: 16, textAlign: 'right' }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 13, color: step.locked ? 'var(--text-soft)' : 'var(--text)' }}>{step.label}</span>
                    {step.locked && <span className="chip" style={{ fontSize: 10 }}>required</span>}
                  </div>
                ))}
              </SectionContent>
            )}

            {/* Courses */}
            {activeSection === 'courses' && (
              <SectionContent title="Courses & syllabi">
                <CoursesSetupPanel userId={user.id} courses={courses} onCoursesChanged={fetchCourses} />
              </SectionContent>
            )}

            {/* Notion */}
            {activeSection === 'notion' && (
              <SectionContent title="Notion">
                <NotionConnectPanel userSettings={userSettings} onSettingsChange={setUserSettings} />
              </SectionContent>
            )}

            {/* Export */}
            {activeSection === 'export' && (
              <SectionContent title="Export">
                <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>
                  Export options will be available here in a future update.
                </p>
              </SectionContent>
            )}

            {/* Audio */}
            {activeSection === 'audio' && (
              <SectionContent title="Audio & capture">
                <SettingBlock label="Encoding">
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>16kbps mono (default) — optimized for speech transcription</div>
                </SettingBlock>
                <SettingBlock label="Noise suppression">
                  <ToggleRow label="Enable noise suppression" checked={true} onChange={() => {}} />
                </SettingBlock>
              </SectionContent>
            )}

            {/* Confusion flags */}
            {activeSection === 'flags' && (
              <SectionContent title="Confusion flags">
                <SettingBlock label="Keyboard shortcut">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Press during recording to mark a confusion moment:</span>
                    <kbd className="kbd">⌘F</kbd>
                  </div>
                </SettingBlock>
              </SectionContent>
            )}

            {/* Data */}
            {activeSection === 'data' && (
              <SectionContent title="Data & storage">
                <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>
                  Storage usage details will appear here once analytics are available.
                </p>
              </SectionContent>
            )}

            {/* Danger zone */}
            {activeSection === 'danger' && (
              <SectionContent title="Danger zone">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <DangerRow
                    label="Wipe flashcard progress"
                    desc="Reset all SRS progress. Your flashcards remain but ratings are cleared."
                    action="Reset progress"
                  />
                  <DangerRow
                    label="Delete account"
                    desc="Permanently delete your account and all associated data. This cannot be undone."
                    action="Delete account"
                    onAction={onLogout}
                  />
                </div>
              </SectionContent>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Section helpers ─── */

const SectionContent: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 20px', letterSpacing: '-0.01em', color: 'var(--text)' }}>{title}</h2>
    {children}
  </div>
);

const SettingBlock: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: 8 }}>{label}</div>
    {children}
  </div>
);

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
    <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{value}</span>
  </div>
);

const ToggleRow: React.FC<{ label: string; checked: boolean; onChange: () => void }> = ({ label, checked, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
    <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
    <button
      type="button"
      onClick={onChange}
      style={{
        position: 'relative', width: 40, height: 22, borderRadius: 999,
        background: checked ? 'var(--accent)' : 'var(--border-strong)',
        border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'background 150ms',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: checked ? 21 : 3,
        width: 16, height: 16, borderRadius: '50%', background: 'white',
        transition: 'left 150ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  </div>
);

const DangerRow: React.FC<{ label: string; desc: string; action: string; onAction?: () => void }> = ({ label, desc, action, onAction }) => (
  <div style={{ padding: '14px 16px', borderRadius: 'var(--r)', border: '1px solid var(--bad-soft)', background: 'var(--bg-elev)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
    <div>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--text-soft)', maxWidth: 400, lineHeight: 1.5 }}>{desc}</div>
    </div>
    <button
      type="button"
      className="btn"
      style={{ color: 'var(--bad)', borderColor: 'var(--bad-soft)', flexShrink: 0 }}
      onClick={onAction}
    >
      {action}
    </button>
  </div>
);

const ShortcutsTable: React.FC = () => {
  const groups = [
    {
      label: 'Global',
      items: [
        ['⌘K', 'Open command palette'],
        ['⌘/', 'Focus search'],
        ['G then H', 'Go to dashboard'],
        ['G then P', 'Go to planner'],
      ],
    },
    {
      label: 'In lecture',
      items: [
        ['⌘F', 'Flag confusion moment'],
        ['⌘]', 'Next section'],
        ['⌘[', 'Previous section'],
        ['⌘E', 'Open/close Ask Professor'],
      ],
    },
    {
      label: 'Flashcards',
      items: [
        ['Space', 'Flip card'],
        ['1', 'Again'],
        ['2', 'Hard'],
        ['3', 'Good'],
      ],
    },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {groups.map(g => (
        <div key={g.label}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: 8 }}>{g.label}</div>
          {g.items.map(([key, label]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
              <kbd className="kbd">{key}</kbd>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default SettingsPage;
