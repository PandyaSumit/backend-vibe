import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  BrainCircuit,
  Send,
  Save,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Shield,
  Clock,
  Filter,
  BarChart3,
  Loader2,
  Settings,
} from 'lucide-react';
import { endpoints as endpointsApi, schemas as schemasApi } from '../services/api';
import CodePreview from '../components/CodePreview';
import SettingsDrawer from '../components/SettingsDrawer';
import useSettings from '../hooks/useSettings';

const METHOD_COLORS = {
  GET: 'bg-green-900/30 text-green-400 border-green-800',
  POST: 'bg-blue-900/30 text-blue-400 border-blue-800',
};

const OPERATOR_LABELS = {
  eq: '=', ne: '!=', gt: '>', gte: '>=', lt: '<', lte: '<=',
  in: 'in', nin: 'not in', regex: 'regex', exists: 'exists', between: 'between',
};

function EndpointDefinitionView({ definition, warnings }) {
  const [expanded, setExpanded] = useState(true);
  const ep = definition;

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-900/50 hover:bg-zinc-900 transition-colors text-left"
      >
        <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${METHOD_COLORS[ep.method] || METHOD_COLORS.GET}`}>
          {ep.method}
        </span>
        <span className="font-mono text-sm text-zinc-200">{ep.path}</span>
        <span className="text-xs text-zinc-500 flex-1 truncate">{ep.description}</span>
        {expanded ? <ChevronUp size={14} className="text-zinc-600" /> : <ChevronDown size={14} className="text-zinc-600" />}
      </button>

      {expanded && (
        <div className="p-4 space-y-4">
          {warnings && warnings.length > 0 && (
            <div className="p-3 bg-yellow-900/20 border border-yellow-800/50 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-400 text-xs font-medium mb-1.5">
                <AlertTriangle size={12} />
                Validation Warnings
              </div>
              <ul className="space-y-1">
                {warnings.map((w, i) => (
                  <li key={i} className="text-xs text-yellow-300/80">{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1.5">Source Collection</div>
              <div className="px-3 py-1.5 bg-zinc-800 rounded text-sm font-mono text-blue-400">{ep.sourceCollection}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1.5">Output Fields</div>
              <div className="flex flex-wrap gap-1">
                {(ep.outputFields || []).length > 0 ? (
                  ep.outputFields.map((f) => (
                    <span key={f} className="px-2 py-0.5 bg-zinc-800 rounded text-xs font-mono text-zinc-300">{f}</span>
                  ))
                ) : (
                  <span className="text-xs text-zinc-600">All fields</span>
                )}
              </div>
            </div>
          </div>

          {(ep.filters || []).length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase tracking-wide mb-1.5">
                <Filter size={10} /> Filters
              </div>
              <div className="space-y-1">
                {ep.filters.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 rounded text-xs">
                    <span className="font-mono text-zinc-300">{f.field}</span>
                    <span className="text-zinc-500">{OPERATOR_LABELS[f.operator] || f.operator}</span>
                    <span className="text-zinc-400">
                      {f.valueSource === 'static' ? JSON.stringify(f.staticValue) : `query.${f.field}`}
                    </span>
                    {f.description && <span className="text-zinc-600 ml-auto">{f.description}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(ep.aggregations || []).length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase tracking-wide mb-1.5">
                <BarChart3 size={10} /> Aggregations
              </div>
              <div className="space-y-1">
                {ep.aggregations.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 rounded text-xs">
                    <span className="text-purple-400 font-medium">{a.operation}</span>
                    {a.field && <span className="font-mono text-zinc-300">{a.field}</span>}
                    <span className="text-zinc-500">as</span>
                    <span className="font-mono text-zinc-200">{a.alias}</span>
                  </div>
                ))}
                {ep.groupBy && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 rounded text-xs">
                    <span className="text-cyan-400 font-medium">GROUP BY</span>
                    <span className="font-mono text-zinc-300">{ep.groupBy}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            {ep.sort?.field && (
              <div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Sort</div>
                <div className="text-xs text-zinc-300">
                  <span className="font-mono">{ep.sort.field}</span>{' '}
                  <span className="text-zinc-500">{ep.sort.order}</span>
                </div>
              </div>
            )}
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Pagination</div>
              <div className="text-xs text-zinc-300">
                {ep.pagination?.enabled !== false
                  ? `${ep.pagination?.defaultLimit || 20}/page, max ${ep.pagination?.maxLimit || 100}`
                  : 'Disabled'}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-[10px] text-zinc-500 uppercase tracking-wide mb-1">
                <Clock size={9} /> Cache
              </div>
              <div className="text-xs text-zinc-300">
                {ep.cache?.enabled ? `${ep.cache.ttlSeconds}s TTL` : 'Off'}
              </div>
            </div>
          </div>

          {ep.auth?.required && (
            <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 rounded">
              <Shield size={12} className="text-amber-400" />
              <span className="text-xs text-zinc-300">Auth required</span>
              {(ep.auth.roles || []).length > 0 && (
                <span className="text-xs text-zinc-500">
                  Roles: {ep.auth.roles.join(', ')}
                </span>
              )}
            </div>
          )}

          {(ep.safetyNotes || []).length > 0 && (
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1.5">Safety & Performance Notes</div>
              <ul className="space-y-1">
                {ep.safetyNotes.map((note, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                    <AlertTriangle size={10} className="mt-0.5 text-amber-500 shrink-0" />
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function EndpointBuilder() {
  const { projectId } = useParams();
  const settings = useSettings(projectId);

  const [prompt, setPrompt] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [savedEndpoints, setSavedEndpoints] = useState([]);
  const [schemaList, setSchemaList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [projectId]);

  async function loadData() {
    try {
      const [epData, schData] = await Promise.all([
        endpointsApi.listByProject(projectId),
        schemasApi.listByProject(projectId),
      ]);
      setSavedEndpoints(epData);
      setSchemaList(schData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate(e) {
    e.preventDefault();
    if (!prompt.trim()) return;

    if (!settings.hasKey) {
      setShowSettings(true);
      setError('Configure your Groq API key in Settings first');
      return;
    }
    if (schemaList.length === 0) {
      setError('Create at least one schema before generating endpoints');
      return;
    }

    setGenerating(true);
    setError('');
    setResult(null);

    try {
      const data = await endpointsApi.generate({
        projectId,
        prompt: prompt.trim(),
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!result?.endpoint) return;
    setSaving(true);
    setError('');

    try {
      await endpointsApi.save({
        ...result.endpoint,
        project: projectId,
        sourcePrompt: result.sourcePrompt || prompt,
      });
      setResult(null);
      setPrompt('');
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this endpoint?')) return;
    try {
      await endpointsApi.delete(id);
      setSavedEndpoints((prev) => prev.filter((ep) => ep._id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  const EXAMPLE_PROMPTS = [
    'Get all orders from the last 30 days sorted by total amount descending',
    'Count users grouped by their role',
    'Find products with price between $10 and $100, return name and price only',
  ];

  if (loading) return <div className="p-8 text-zinc-500 text-sm">Loading...</div>;

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-100 flex items-center gap-2">
            <BrainCircuit size={24} className="text-purple-400" />
            AI Endpoint Builder
          </h1>
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-colors"
          >
            <Settings size={12} />
            {settings.hasKey ? 'Key configured' : 'Set API Key'}
          </button>
        </div>
        <p className="text-sm text-zinc-500 mt-1">
          Describe an API endpoint in plain English. Groq AI translates it into a structured,
          production-safe endpoint definition using your schemas.
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-900/30 border border-red-800 text-red-300 text-sm rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-200 ml-4">x</button>
        </div>
      )}

      {/* Schema context indicator */}
      <div className="mb-4 flex gap-2 flex-wrap">
        <span className="text-[10px] text-zinc-600 uppercase tracking-wide self-center">Schemas:</span>
        {schemaList.map((s) => (
          <span key={s._id} className="px-2 py-0.5 bg-zinc-800 rounded text-xs font-mono text-zinc-400">
            {s.name} ({(s.fields || []).length} fields)
          </span>
        ))}
        {schemaList.length === 0 && (
          <span className="text-xs text-zinc-600">No schemas yet. Create schemas first.</span>
        )}
      </div>

      {/* Prompt input */}
      <form onSubmit={handleGenerate} className="mb-6">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the API endpoint you need... e.g., 'Get all orders from the last 30 days, sorted by total descending, with pagination'"
            rows={3}
            className="w-full px-4 py-3 pr-24 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 resize-none focus:border-purple-500 focus:outline-none placeholder:text-zinc-600"
          />
          <button
            type="submit"
            disabled={generating || !prompt.trim()}
            className="absolute right-2 bottom-2 flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40"
          >
            {generating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Send size={14} />
                Generate
              </>
            )}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {EXAMPLE_PROMPTS.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setPrompt(ex)}
              className="px-2 py-0.5 text-[10px] text-zinc-600 hover:text-zinc-400 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </form>

      {/* Generated result */}
      {result && result.endpoint && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              {result.valid ? (
                <CheckCircle2 size={14} className="text-green-400" />
              ) : (
                <AlertTriangle size={14} className="text-yellow-400" />
              )}
              Generated Endpoint
              {!result.valid && (
                <span className="text-xs text-yellow-400 font-normal">(has warnings)</span>
              )}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setResult(null)}
                className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-colors"
              >
                Discard
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !result.valid}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
              >
                <Save size={12} />
                {saving ? 'Saving...' : 'Save Endpoint'}
              </button>
            </div>
          </div>
          <EndpointDefinitionView definition={result.endpoint} warnings={result.warnings} />
        </div>
      )}

      {/* Saved endpoints */}
      <div>
        <h2 className="text-sm font-medium text-zinc-300 mb-3">
          Saved Custom Endpoints ({savedEndpoints.length})
        </h2>
        {savedEndpoints.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-zinc-800 rounded-lg">
            <BrainCircuit size={36} className="mx-auto text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-600 mb-1">No custom endpoints yet</p>
            <p className="text-xs text-zinc-700">
              Describe an API you need above and let Groq AI design it.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedEndpoints.map((ep) => (
              <div key={ep._id} className="relative group">
                <EndpointDefinitionView definition={ep} warnings={[]} />
                <button
                  onClick={() => handleDelete(ep._id)}
                  className="absolute top-3 right-12 p-1.5 text-zinc-700 hover:text-red-400 rounded transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settings Drawer */}
      <SettingsDrawer open={showSettings} onClose={() => setShowSettings(false)} settings={settings} />
    </div>
  );
}
