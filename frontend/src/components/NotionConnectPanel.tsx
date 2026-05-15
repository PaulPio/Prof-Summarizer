import React, { useState, useEffect } from 'react';
import { SettingsService } from '../services/settingsService';
import { UserSettings } from '../types';

interface Props {
  userSettings: UserSettings | null;
  onSettingsChange: (settings: UserSettings) => void;
  compact?: boolean;
}

const NotionConnectPanel: React.FC<Props> = ({ userSettings, onSettingsChange, compact }) => {
  const [notionDefaultPageId, setNotionDefaultPageId] = useState(userSettings?.notionDefaultPageId || '');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const connected = userSettings?.hasNotionConnection ?? false;

  useEffect(() => {
    setNotionDefaultPageId(userSettings?.notionDefaultPageId || '');
  }, [userSettings?.notionDefaultPageId]);

  const handleConnect = async () => {
    setIsBusy(true);
    setError('');
    try {
      const url = await SettingsService.startNotionOAuth();
      window.location.href = url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to connect Notion');
      setIsBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setIsBusy(true);
    setError('');
    try {
      await SettingsService.disconnectNotion();
      const updated = await SettingsService.getSettings();
      onSettingsChange(updated);
      setMessage('Notion disconnected.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveDefaultPage = async () => {
    setIsBusy(true);
    setError('');
    setMessage('');
    try {
      await SettingsService.updateSettings({ notionDefaultPageId });
      const updated = await SettingsService.getSettings();
      onSettingsChange(updated);
      setMessage('Default page saved.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {connected ? (
        <div className="p-4 rounded-xl bg-green-50 border border-green-100">
          <p className="text-sm font-bold text-green-800">Connected to Notion</p>
          {userSettings?.notionWorkspaceName && (
            <p className="text-xs text-green-700 mt-1">Workspace: {userSettings.notionWorkspaceName}</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-600">
          Sign in with your Notion account to export Cornell notes, flashcards, and summaries.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {!connected ? (
          <button
            type="button"
            onClick={handleConnect}
            disabled={isBusy}
            className="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {isBusy ? 'Redirecting…' : 'Connect Notion'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={isBusy}
            className="px-5 py-2.5 border border-red-200 text-red-600 rounded-xl font-bold text-sm hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            Disconnect
          </button>
        )}
      </div>

      {connected && !compact && (
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Default export page ID</label>
          <input
            type="text"
            value={notionDefaultPageId}
            onChange={e => setNotionDefaultPageId(e.target.value)}
            placeholder="Optional — pick on each export if blank"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleSaveDefaultPage}
            disabled={isBusy}
            className="mt-3 w-full py-2.5 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            Save default page
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-600">{message}</p>}
    </div>
  );
};

export default NotionConnectPanel;
