import { useState } from 'react';
import { X, Key, Check, AlertCircle, Loader2 } from 'lucide-react';

export default function SettingsDrawer({ open, onClose, settings }) {
  const [keyInput, setKeyInput] = useState('');
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  async function handleSave(e) {
    e.preventDefault();
    setLocalError('');
    setSuccess(false);

    const key = keyInput.trim();
    if (!key) {
      setLocalError('Please enter a Groq API key');
      return;
    }
    if (!key.startsWith('gsk_')) {
      setLocalError('Groq API keys start with gsk_');
      return;
    }

    const ok = await settings.saveKey(key);
    if (ok) {
      setKeyInput('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  }

  const displayError = localError || settings.error;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-80 bg-zinc-900 border-l border-zinc-800 h-full overflow-auto">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-100">Project Settings</h2>
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Groq API Key */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 mb-2">
              <Key size={12} />
              Groq API Key
            </label>

            {settings.hasKey && (
              <div className="mb-2 px-3 py-2 bg-zinc-800 rounded-lg text-xs font-mono text-zinc-400 flex items-center gap-2">
                <Check size={12} className="text-green-400" />
                {settings.maskedKey || 'Key configured'}
              </div>
            )}

            <form onSubmit={handleSave}>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder={settings.hasKey ? 'Enter new key to update...' : 'gsk_...'}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-100 font-mono focus:border-blue-500 focus:outline-none placeholder:text-zinc-600"
              />
              <button
                type="submit"
                disabled={settings.saving}
                className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
              >
                {settings.saving ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  settings.hasKey ? 'Update Key' : 'Save Key'
                )}
              </button>
            </form>

            <p className="text-[10px] text-zinc-600 mt-2">
              Your key is encrypted server-side with AES-256-GCM. It is never sent to the browser.
            </p>
          </div>

          {displayError && (
            <div className="px-3 py-2 bg-red-900/30 border border-red-800 rounded-lg text-xs text-red-300 flex items-center gap-2">
              <AlertCircle size={12} />
              {displayError}
            </div>
          )}

          {success && (
            <div className="px-3 py-2 bg-green-900/30 border border-green-800 rounded-lg text-xs text-green-300 flex items-center gap-2">
              <Check size={12} />
              API key saved securely
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
