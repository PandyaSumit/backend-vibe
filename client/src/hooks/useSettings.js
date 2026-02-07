import { useState, useEffect, useCallback } from 'react';
import { settings as settingsApi } from '../services/api';

export default function useSettings(projectId) {
  const [hasKey, setHasKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await settingsApi.get(projectId);
      setHasKey(data.hasGroqKey);
      setMaskedKey(data.groqApiKeyMasked || '');
    } catch {
      // Settings may not exist yet — that's fine
      setHasKey(false);
      setMaskedKey('');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveKey(plainKey) {
    setSaving(true);
    setError('');
    try {
      await settingsApi.update(projectId, { groqApiKey: plainKey });
      setHasKey(true);
      setMaskedKey(plainKey.slice(0, 4) + '...' + plainKey.slice(-4));
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { hasKey, maskedKey, loading, saving, error, saveKey, reload: load, setError };
}
