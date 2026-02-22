import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Zap,
  ChevronDown,
  ChevronUp,
  Copy,
  Play,
  Loader2,
  Trash2,
  RotateCcw,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { schemas as schemasApi, sandbox as sandboxApi, endpoints as endpointsApi } from '../services/api';

const METHOD_COLORS = {
  GET: 'bg-green-900/30 text-green-400 border-green-800',
  POST: 'bg-blue-900/30 text-blue-400 border-blue-800',
  PUT: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
  DELETE: 'bg-red-900/30 text-red-400 border-red-800',
};

const METHOD_BG = {
  GET: 'hover:border-green-800/50',
  POST: 'hover:border-blue-800/50',
  PUT: 'hover:border-yellow-800/50',
  DELETE: 'hover:border-red-800/50',
};

function generateEndpoints(schema) {
  const eps = schema.endpoints || {};
  const routeName = schema.name.toLowerCase() + 's';
  const base = `/api/${routeName}`;
  const fields = schema.fields || [];
  const endpoints = [];

  if (eps.getAll !== false) {
    const queryParams = fields
      .filter((f) => ['String', 'Number', 'Boolean', 'ObjectId'].includes(f.fieldType))
      .map((f) => f.name);
    endpoints.push({
      method: 'GET',
      path: base,
      description: `List all ${routeName} with pagination and filtering`,
      queryParams: ['page', 'limit', 'sort', ...queryParams],
      body: null,
      response: `{ data: [${schema.name}], pagination: { page, limit, total, pages } }`,
      collection: schema.name,
      sandboxMethod: 'GET',
    });
  }

  if (eps.getById !== false) {
    endpoints.push({
      method: 'GET',
      path: `${base}/:id`,
      description: `Get a single ${schema.name} by ID`,
      queryParams: [],
      body: null,
      response: `${schema.name} object`,
      collection: schema.name,
      sandboxMethod: 'GET',
      needsId: true,
    });
  }

  if (eps.create !== false) {
    const bodyFields = fields
      .map((f) => `  "${f.name}": <${f.fieldType}>${f.required ? ' // required' : ''}`)
      .join('\n');
    const bodyTemplate = {};
    fields.forEach((f) => {
      if (f.fieldType === 'String') bodyTemplate[f.name] = '';
      else if (f.fieldType === 'Number') bodyTemplate[f.name] = 0;
      else if (f.fieldType === 'Boolean') bodyTemplate[f.name] = false;
      else bodyTemplate[f.name] = '';
    });
    endpoints.push({
      method: 'POST',
      path: base,
      description: `Create a new ${schema.name}`,
      queryParams: [],
      body: `{\n${bodyFields}\n}`,
      bodyTemplate: JSON.stringify(bodyTemplate, null, 2),
      response: `Created ${schema.name} object (201)`,
      collection: schema.name,
      sandboxMethod: 'POST',
    });
  }

  if (eps.update !== false) {
    const bodyFields = fields.map((f) => `  "${f.name}": <${f.fieldType}>`).join('\n');
    const bodyTemplate = {};
    fields.forEach((f) => {
      if (f.fieldType === 'String') bodyTemplate[f.name] = '';
      else if (f.fieldType === 'Number') bodyTemplate[f.name] = 0;
      else if (f.fieldType === 'Boolean') bodyTemplate[f.name] = false;
      else bodyTemplate[f.name] = '';
    });
    endpoints.push({
      method: 'PUT',
      path: `${base}/:id`,
      description: `Update a ${schema.name} by ID`,
      queryParams: [],
      body: `{\n${bodyFields}\n}`,
      bodyTemplate: JSON.stringify(bodyTemplate, null, 2),
      response: `Updated ${schema.name} object`,
      collection: schema.name,
      sandboxMethod: 'PUT',
      needsId: true,
    });
  }

  if (eps.delete !== false) {
    endpoints.push({
      method: 'DELETE',
      path: `${base}/:id`,
      description: `Delete a ${schema.name} by ID`,
      queryParams: [],
      body: null,
      response: `{ message: "${schema.name} deleted" }`,
      collection: schema.name,
      sandboxMethod: 'DELETE',
      needsId: true,
    });
  }

  return endpoints;
}

function EndpointRow({ ep, projectId }) {
  const [expanded, setExpanded] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testBody, setTestBody] = useState(ep.bodyTemplate || '');
  const [testId, setTestId] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState('');

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    setTestError('');

    try {
      let body = null;
      if (testBody && (ep.sandboxMethod === 'POST' || ep.sandboxMethod === 'PUT')) {
        body = JSON.parse(testBody);
      }

      const result = await sandboxApi.execute(projectId, {
        collection: ep.collection,
        method: ep.sandboxMethod,
        id: ep.needsId ? testId : undefined,
        body,
        query: {},
      });
      setTestResult(result);
    } catch (err) {
      setTestError(err.message);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className={`border border-zinc-800 rounded-lg overflow-hidden ${METHOD_BG[ep.method]} transition-colors`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-900/50 transition-colors text-left"
      >
        <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${METHOD_COLORS[ep.method]}`}>
          {ep.method}
        </span>
        <span className="font-mono text-sm text-zinc-200">{ep.path}</span>
        <span className="text-xs text-zinc-500 flex-1">{ep.description}</span>
        {expanded ? (
          <ChevronUp size={14} className="text-zinc-600" />
        ) : (
          <ChevronDown size={14} className="text-zinc-600" />
        )}
      </button>

      {expanded && (
        <div className="px-4 py-3 border-t border-zinc-800 space-y-3 bg-zinc-950/50">
          {ep.queryParams && ep.queryParams.length > 0 && (
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">
                Query Parameters
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ep.queryParams.map((p) => (
                  <span key={p} className="px-2 py-0.5 bg-zinc-800 rounded text-xs font-mono text-zinc-400">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {ep.body && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wide">Request Body</span>
                <button
                  onClick={() => navigator.clipboard.writeText(ep.body)}
                  className="text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  <Copy size={12} />
                </button>
              </div>
              <pre className="p-3 bg-zinc-900 rounded-lg text-xs font-mono text-zinc-300 overflow-x-auto">
                {ep.body}
              </pre>
            </div>
          )}

          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Response</div>
            <div className="text-xs text-zinc-400 font-mono">{ep.response}</div>
          </div>

          {/* Live Sandbox Tester */}
          <div className="border-t border-zinc-800 pt-3">
            <div className="flex items-center gap-2 mb-2">
              <Play size={12} className="text-emerald-400" />
              <span className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium">
                Sandbox Tester
              </span>
              <span className="text-[10px] text-zinc-600">(runs against isolated test data)</span>
            </div>

            {ep.needsId && (
              <div className="mb-2">
                <input
                  type="text"
                  value={testId}
                  onChange={(e) => setTestId(e.target.value)}
                  placeholder="Document ID"
                  className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-100 font-mono focus:border-blue-500 focus:outline-none placeholder:text-zinc-700"
                />
              </div>
            )}

            {(ep.sandboxMethod === 'POST' || ep.sandboxMethod === 'PUT') && (
              <div className="mb-2">
                <textarea
                  value={testBody}
                  onChange={(e) => setTestBody(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-100 font-mono resize-none focus:border-blue-500 focus:outline-none"
                  placeholder="JSON body..."
                />
              </div>
            )}

            <button
              onClick={handleTest}
              disabled={testing || (ep.needsId && !testId && ep.sandboxMethod !== 'GET')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
            >
              {testing ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Send size={12} />
              )}
              {testing ? 'Running...' : 'Run Request'}
            </button>

            {/* Test result */}
            {testResult && (
              <div className="mt-2 p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-green-400 uppercase tracking-wide flex items-center gap-1">
                    <CheckCircle2 size={10} />
                    Response
                  </span>
                  <button
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(testResult, null, 2))}
                    className="text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    <Copy size={11} />
                  </button>
                </div>
                <pre className="text-xs font-mono text-zinc-300 overflow-x-auto max-h-48 overflow-y-auto">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            )}

            {testError && (
              <div className="mt-2 px-3 py-2 bg-red-900/30 border border-red-800 rounded text-xs text-red-300">
                {testError}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApiExplorer() {
  const { projectId } = useParams();
  const [schemaList, setSchemaList] = useState([]);
  const [customEndpoints, setCustomEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  useEffect(() => {
    loadData();
  }, [projectId]);

  async function loadData() {
    try {
      const [schemas, eps] = await Promise.all([
        schemasApi.listByProject(projectId),
        endpointsApi.listByProject(projectId),
      ]);
      setSchemaList(schemas.filter((s) => s.generateCrud));
      setCustomEndpoints(eps);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetSandbox() {
    if (!window.confirm('Clear all sandbox test data for this project?')) return;
    setResetting(true);
    setResetMsg('');
    try {
      const result = await sandboxApi.reset(projectId);
      setResetMsg(result.message || 'Sandbox data cleared');
      setTimeout(() => setResetMsg(''), 3000);
    } catch (err) {
      setResetMsg(`Error: ${err.message}`);
    } finally {
      setResetting(false);
    }
  }

  if (loading) return <div className="p-8 text-zinc-500 text-sm">Loading...</div>;

  const totalEndpoints = schemaList.reduce((sum, s) => sum + generateEndpoints(s).length, 0);

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100 flex items-center gap-2">
            <Zap size={24} className="text-yellow-400" />
            API Explorer
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {totalEndpoints} CRUD endpoints + {customEndpoints.length} custom endpoints.
            Test them live in the sandbox.
          </p>
        </div>
        <button
          onClick={handleResetSandbox}
          disabled={resetting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-500 hover:text-red-400 border border-zinc-800 hover:border-red-800/50 rounded-lg transition-colors"
        >
          <RotateCcw size={12} className={resetting ? 'animate-spin' : ''} />
          {resetting ? 'Clearing...' : 'Reset Sandbox'}
        </button>
      </div>

      {resetMsg && (
        <div className="mb-4 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-400">
          {resetMsg}
        </div>
      )}

      {schemaList.length === 0 && customEndpoints.length === 0 ? (
        <div className="text-center py-20">
          <Zap size={48} className="mx-auto text-zinc-700 mb-4" />
          <h3 className="text-lg font-medium text-zinc-400 mb-2">No API endpoints</h3>
          <p className="text-sm text-zinc-600">
            Create schemas with CRUD generation enabled to see endpoints here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* CRUD endpoints */}
          {schemaList.map((schema) => {
            const endpoints = generateEndpoints(schema);
            return (
              <div key={schema._id}>
                <h2 className="text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
                  <span className="text-blue-400">{schema.name}</span>
                  <span className="text-zinc-600">
                    ({endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''})
                  </span>
                </h2>
                <div className="space-y-1.5">
                  {endpoints.map((ep, i) => (
                    <EndpointRow key={i} ep={ep} projectId={projectId} />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Custom AI endpoints */}
          {customEndpoints.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
                <span className="text-purple-400">Custom Endpoints</span>
                <span className="text-zinc-600">({customEndpoints.length})</span>
              </h2>
              <div className="space-y-1.5">
                {customEndpoints.map((ep) => (
                  <EndpointRow
                    key={ep._id}
                    ep={{
                      method: ep.method || 'GET',
                      path: ep.path,
                      description: ep.description,
                      queryParams: (ep.filters || []).map((f) => f.field),
                      body: null,
                      response: `Custom endpoint response`,
                      collection: ep.sourceCollection,
                      sandboxMethod: ep.method || 'GET',
                    }}
                    projectId={projectId}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
