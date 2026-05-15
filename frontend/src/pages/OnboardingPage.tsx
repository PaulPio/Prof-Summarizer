import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AIProvider } from '../types';
import { SettingsService } from '../services/settingsService';
import { useAppContext } from '../context/AppContext';
import CanvasConnectPanel from '../components/CanvasConnectPanel';
import NotionConnectPanel from '../components/NotionConnectPanel';

const TOTAL_STEPS = 4;

const AI_PROVIDERS: { id: AIProvider; label: string; desc: string }[] = [
  { id: 'gemini', label: 'Google Gemini', desc: 'Free to start with Google AI Studio key' },
  { id: 'openai', label: 'OpenAI', desc: 'GPT-4o and GPT-4o-mini' },
  { id: 'anthropic', label: 'Anthropic Claude', desc: 'Claude Sonnet and Haiku' },
  { id: 'openrouter', label: 'OpenRouter', desc: 'Access 200+ models with one key' },
];

const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { userSettings, setUserSettings } = useAppContext();
  const [step, setStep] = useState(1);
  const [isFinishing, setIsFinishing] = useState(false);

  // Step 1: Agents
  const [agents, setAgents] = useState({
    agentAutoOrganizer: false,
    agentStudyPlanner: false,
    agentResearch: false,
    agentMultiStep: false,
  });

  // Step 3: AI provider + key
  const [provider, setProvider] = useState<AIProvider>('gemini');
  const [apiKey, setApiKey] = useState('');

  const toggleAgent = (key: keyof typeof agents) =>
    setAgents(prev => ({ ...prev, [key]: !prev[key] }));

  const finish = async () => {
    setIsFinishing(true);
    try {
      const patch: Record<string, any> = {
        ...agents,
        aiProvider: provider,
        hasCompletedOnboarding: true,
      };
      if (apiKey.trim()) {
        const keyField: Record<AIProvider, string> = {
          gemini: 'geminiApiKey',
          openai: 'openaiApiKey',
          anthropic: 'anthropicApiKey',
          openrouter: 'openrouterApiKey',
        };
        patch[keyField[provider]] = apiKey.trim();
      }
      await SettingsService.updateSettings(patch);
      const updated = await SettingsService.getSettings();
      setUserSettings(updated);
      navigate('/');
    } catch (err) {
      console.error('Onboarding save failed:', err);
      navigate('/');
    }
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div key={i} className={`h-2 rounded-full transition-all ${i + 1 === step ? 'w-8 bg-blue-600' : i + 1 < step ? 'w-4 bg-blue-400' : 'w-4 bg-gray-200'}`} />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">🎓</div>
          <h1 className="text-3xl font-black text-gray-900">Welcome to ProfSummarizer</h1>
          <p className="text-gray-500 mt-2">Let's set up your workspace in a few quick steps.</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border p-8">
          <StepIndicator />

          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-black text-gray-900">Choose Your AI Agents</h2>
                <p className="text-sm text-gray-500 mt-1">Enable the agents you want to help with your studies.</p>
              </div>
              <div className="space-y-3">
                {[
                  { key: 'agentAutoOrganizer' as const, icon: '📁', label: 'Auto-Organizer', desc: 'Automatically sort lectures into courses' },
                  { key: 'agentStudyPlanner' as const, icon: '📅', label: 'Study Planner', desc: 'Get a personalized study schedule' },
                  { key: 'agentResearch' as const, icon: '🔍', label: 'Research Assistant', desc: 'Find study directions for confusing topics' },
                  { key: 'agentMultiStep' as const, icon: '⚡', label: 'Multi-Step Pipeline', desc: 'Automate post-lecture processing' },
                ].map(({ key, icon, label, desc }) => (
                  <button
                    key={key}
                    onClick={() => toggleAgent(key)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${agents[key] ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <span className="text-2xl">{icon}</span>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-sm">{label}</p>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${agents[key] ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                      {agents[key] && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-black text-gray-900">Canvas LMS</h2>
                <p className="text-sm text-gray-500 mt-1">Connect your Canvas account to import course materials. You can skip this and set it up later in Settings.</p>
              </div>
              <CanvasConnectPanel
                userSettings={userSettings}
                onSettingsChange={setUserSettings}
                compact
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-black text-gray-900">AI Provider</h2>
                <p className="text-sm text-gray-500 mt-1">Choose your AI provider. You can always use ProfSummarizer without a key using the built-in Gemini access.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {AI_PROVIDERS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setProvider(p.id)}
                    className={`flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all ${provider === p.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <p className="font-bold text-sm text-gray-900">{p.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">API Key (optional)</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="Paste your API key to use your own quota…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">Leave blank to use the built-in Gemini access. Keys are encrypted at rest.</p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-black text-gray-900">Notion Export</h2>
                <p className="text-sm text-gray-500 mt-1">Connect Notion to export Cornell notes, flashcards, and summaries. Skip to set it up later.</p>
              </div>
              <NotionConnectPanel
                userSettings={userSettings}
                onSettingsChange={setUserSettings}
                compact
              />
              <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                <p className="text-sm font-bold text-green-800 mb-1">You're all set!</p>
                <p className="text-xs text-green-700">Your preferences have been saved. You can change everything anytime in Settings.</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)} className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Back
              </button>
            )}
            {step < TOTAL_STEPS ? (
              <button onClick={() => setStep(s => s + 1)} className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors">
                {step === 2 || step === 4 ? 'Skip for now' : 'Continue'}
              </button>
            ) : (
              <button onClick={finish} disabled={isFinishing} className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {isFinishing ? 'Setting up…' : 'Get Started'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
