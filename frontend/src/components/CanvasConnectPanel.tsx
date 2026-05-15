import React, { useState, useEffect } from 'react';
import { SettingsService } from '../services/settingsService';
import { CanvasService } from '../services/canvasService';
import { UserSettings } from '../types';

interface Props {
  userSettings: UserSettings | null;
  onSettingsChange: (settings: UserSettings) => void;
  onBrowseMaterials?: () => void;
  compact?: boolean;
}

function normalizeCanvasUrl(url: string): string {
  const trimmed = url.trim().replace(/\/$/, '');
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function canvasTokenSettingsUrl(instanceUrl: string): string {
  const base = normalizeCanvasUrl(instanceUrl);
  return `${base}/profile/settings`;
}

const CanvasConnectPanel: React.FC<Props> = ({
  userSettings,
  onSettingsChange,
  onBrowseMaterials,
  compact,
}) => {
  const [canvasInstanceUrl, setCanvasInstanceUrl] = useState(userSettings?.canvasInstanceUrl || '');
  const [canvasToken, setCanvasToken] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const connected = userSettings?.hasCanvasToken ?? false;
  const displayName = userSettings?.canvasUserName;

  useEffect(() => {
    setCanvasInstanceUrl(userSettings?.canvasInstanceUrl || '');
  }, [userSettings?.canvasInstanceUrl]);

  const handleOpenCanvasSettings = () => {
    const url = canvasTokenSettingsUrl(canvasInstanceUrl);
    if (!url || url === 'https://') {
      setError('Enter your Canvas instance URL first.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleConnect = async () => {
    const url = normalizeCanvasUrl(canvasInstanceUrl);
    if (!url) {
      setError('Canvas instance URL is required.');
      return;
    }
    if (!canvasToken.trim() && !connected) {
      setError('Paste your Canvas access token.');
      return;
    }

    setIsBusy(true);
    setError('');
    setMessage('');
    try {
      const patch: Record<string, unknown> = { canvasInstanceUrl: url };
      if (canvasToken.trim()) patch.canvasApiToken = canvasToken.trim();
      await SettingsService.updateSettings(patch);

      const profile = await CanvasService.getSelf();
      await SettingsService.updateSettings({ canvasUserName: profile.name });
      const updated = await SettingsService.getSettings();
      onSettingsChange(updated);
      setCanvasToken('');
      setMessage(`Connected as ${profile.name}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to connect Canvas');
    } finally {
      setIsBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setIsBusy(true);
    setError('');
    setMessage('');
    try {
      await SettingsService.disconnectCanvas();
      const updated = await SettingsService.getSettings();
      onSettingsChange(updated);
      setMessage('Canvas disconnected.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {connected ? (
        <div className="p-4 rounded-xl bg-green-50 border border-green-100">
          <p className="text-sm font-bold text-green-800">Canvas connected</p>
          {displayName && <p className="text-xs text-green-700 mt-1">Signed in as {displayName}</p>}
          {userSettings?.canvasInstanceUrl && (
            <p className="text-xs text-green-600 mt-0.5 truncate">{userSettings.canvasInstanceUrl}</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-600">
          Connect your school Canvas account to import courses and materials. You will sign in on your
          institution&apos;s Canvas site and paste a personal access token.
        </p>
      )}

      <div>
        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
          Canvas instance URL
        </label>
        <input
          type="url"
          value={canvasInstanceUrl}
          onChange={e => setCanvasInstanceUrl(e.target.value)}
          placeholder="https://canvas.youruniversity.edu"
          disabled={connected && compact}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
        />
      </div>

      {!connected && (
        <>
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 space-y-2">
            <p className="text-xs font-bold text-blue-900 uppercase tracking-wider">How to connect</p>
            <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
              <li>Enter your school&apos;s Canvas URL above.</li>
              <li>Open Canvas settings and create a new access token.</li>
              <li>Paste the token below and click Connect.</li>
            </ol>
            <button
              type="button"
              onClick={handleOpenCanvasSettings}
              className="text-xs font-bold text-blue-700 hover:text-blue-900 underline"
            >
              Open Canvas → Account → Settings
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
              Access token
            </label>
            <input
              type="password"
              value={canvasToken}
              onChange={e => setCanvasToken(e.target.value)}
              placeholder="Paste token from Approved Integrations…"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
        </>
      )}

      {connected && !compact && (
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
            Replace token (optional)
          </label>
          <input
            type="password"
            value={canvasToken}
            onChange={e => setCanvasToken(e.target.value)}
            placeholder="Enter new token to replace…"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
          {canvasToken.trim() && (
            <button
              type="button"
              onClick={handleConnect}
              disabled={isBusy}
              className="mt-2 w-full py-2 border border-blue-200 text-blue-700 rounded-xl font-bold text-xs hover:bg-blue-50 disabled:opacity-50"
            >
              Update token
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!connected ? (
          <button
            type="button"
            onClick={handleConnect}
            disabled={isBusy}
            className="flex-1 min-w-[140px] py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isBusy ? 'Connecting…' : 'Connect Canvas'}
          </button>
        ) : (
          <>
            {onBrowseMaterials && !compact && (
              <button
                type="button"
                onClick={onBrowseMaterials}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors"
              >
                Browse materials
              </button>
            )}
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={isBusy}
              className="flex-1 py-3 border border-red-200 text-red-600 rounded-xl font-bold text-sm hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              Disconnect
            </button>
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-600">{message}</p>}
    </div>
  );
};

export default CanvasConnectPanel;
