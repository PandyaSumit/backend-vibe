import { useState, useEffect } from 'react';
import {
  Play,
  Copy,
  ChevronDown,
  Clock,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Plus,
  Trash2,
  Send,
  Loader2,
  ChevronRight,
  FileJson,
  Hash,
} from 'lucide-react';
import { sandbox as sandboxApi } from '../services/api';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const METHOD_COLORS = {
  GET: 'bg-green-500/10 text-green-400 border-green-500/20',
  POST: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  PUT: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  PATCH: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  DELETE: 'bg-red-500/10 text-red-400 border-red-500/20',
};

function statusClass(s) {
  if (s >= 200 && s < 300) return 'bg-green-500/10 text-green-400';
  if (s >= 400 && s < 500) return 'bg-yellow-500/10 text-yellow-400';
  if (s >= 500) return 'bg-red-500/10 text-red-400';
  return 'bg-zinc-800 text-zinc-400';
}

function JsonViewer({ data }) {
  const str = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  return (
    <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap break-all overflow-auto max-h-[400px] p-3">
      {str}
    </pre>
  );
}

function EndpointSidebar({ schemas, onSelect, selectedPath }) {
  const [expanded, setExpanded] = useState({});

  function toggle(name) {
    setExpanded((p) => ({ ...p, [name]: !p[name] }));
  }

  function generateEndpointsForSchema(schema) {
    const name = schema.name;
    const route = name.toLowerCase() + 's';
    const eps = schema.endpoints || {};
    const list = [];
    if (eps.getAll !== false) list.push({ method: 'GET', path: `/api/${route}`, label: `List ${route}`, schema: name });
    if (eps.getById !== false) list.push({ method: 'GET', path: `/api/${route}/:id`, label: `Get ${name}`, schema: name, needsId: true });
    if (eps.create !== false) list.push({ method: 'POST', path: `/api/${route}`, label: `Create ${name}`, schema: name });
    if (eps.update !== false) list.push({ method: 'PUT', path: `/api/${route}/:id`, label: `Update ${name}`, schema: name, needsId: true });
    if (eps.delete !== false) list.push({ method: 'DELETE', path: `/api/${route}/:id`, label: `Delete ${name}`, schema: name, needsId: true });
    return list;
  }

  return (
    <div className="w-56 shrink-0 border-r border-zinc-800 bg-zinc-900/50 overflow-auto">
      <div className="p-2 border-b border-zinc-800">
        <div className="text-[10px] text-zinc-500 uppercase tracking-wide font-medium px-2 py-1">
          Endpoints
        </div>
      </div>
      <div className="p-1">
        {schemas.map((schema) => {
          const eps = generateEndpointsForSchema(schema);
          const isExpanded = expanded[schema.name] !== false;
          return (
            <div key={schema.name} className="mb-0.5">
              <button
                onClick={() => toggle(schema.name)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 rounded transition-colors"
              >
                <ChevronRight size={10} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                <Hash size={10} className="text-blue-400" />
                <span className="font-medium">{schema.name}</span>
                <span className="text-zinc-600 text-[10px] ml-auto">{eps.length}</span>
              </button>
              {isExpanded && (
                <div className="ml-3 space-y-0.5">
                  {eps.map((ep) => {
                    const key = `${ep.method}:${ep.path}`;
                    const isActive = selectedPath === key;
                    return (
                      <button
                        key={key}
                        onClick={() => onSelect(ep)}
                        className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-left transition-colors ${
                          isActive ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300'
                        }`}
                      >
                        <span className={`text-[9px] font-bold w-7 shrink-0 ${
                          ep.method === 'GET' ? 'text-green-400' :
                          ep.method === 'POST' ? 'text-blue-400' :
                          ep.method === 'PUT' ? 'text-amber-400' :
                          ep.method === 'DELETE' ? 'text-red-400' : 'text-zinc-400'
                        }`}>
                          {ep.method.slice(0, 3)}
                        </span>
                        <span className="text-[11px] truncate">{ep.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {schemas.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-zinc-700">
            No schemas with CRUD enabled
          </div>
        )}
      </div>
    </div>
  );
}

export default function Playground({ projectId, schemas, onLog }) {
  const [method, setMethod] = useState('GET');
  const [collection, setCollection] = useState('');
  const [docId, setDocId] = useState('');
  const [bodyStr, setBodyStr] = useState('{\n  \n}');
  const [queryParams, setQueryParams] = useState([]);
  const [executing, setExecuting] = useState(false);
  const [response, setResponse] = useState(null);
  const [responseTab, setResponseTab] = useState('body');
  const [history, setHistory] = useState([]);
  const [selectedPath, setSelectedPath] = useState('');

  const crudSchemas = schemas.filter((s) => s.generateCrud);

  useEffect(() => {
    if (crudSchemas.length > 0 && !collection) {
      setCollection(crudSchemas[0].name);
    }
  }, [crudSchemas]);

  function handleSelectEndpoint(ep) {
    setMethod(ep.method);
    setCollection(ep.schema);
    setDocId('');
    setSelectedPath(`${ep.method}:${ep.path}`);

    if (ep.method === 'POST' || ep.method === 'PUT' || ep.method === 'PATCH') {
      const schema = schemas.find((s) => s.name === ep.schema);
      if (schema) {
        const template = {};
        (schema.fields || []).forEach((f) => {
          if (f.fieldType === 'String') template[f.name] = '';
          else if (f.fieldType === 'Number') template[f.name] = 0;
          else if (f.fieldType === 'Boolean') template[f.name] = false;
          else if (f.fieldType === 'Date') template[f.name] = new Date().toISOString();
          else template[f.name] = '';
        });
        setBodyStr(JSON.stringify(template, null, 2));
      }
    }
  }

  async function handleExecute() {
    if (!collection) return;
    setExecuting(true);
    setResponse(null);

    try {
      let body = null;
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        body = JSON.parse(bodyStr);
      }

      const query = {};
      queryParams.forEach((p) => {
        if (p.key && p.value) query[p.key] = p.value;
      });

      const routeName = collection.toLowerCase() + 's';
      const path = docId ? `/api/${routeName}/${docId}` : `/api/${routeName}`;

      const result = await sandboxApi.execute(projectId, {
        collection,
        method,
        id: docId || undefined,
        body,
        query,
      });

      setResponse(result);
      setResponseTab('body');

      const entry = {
        id: Date.now(),
        method,
        path,
        status: result.status,
        duration: result.duration,
        timestamp: new Date().toISOString(),
      };
      setHistory((prev) => [entry, ...prev].slice(0, 50));

      if (onLog) {
        onLog(method, path, result);
      }
    } catch (err) {
      setResponse({
        status: 500,
        statusText: 'Error',
        headers: {},
        body: { error: err.message },
        duration: '0ms',
        size: 0,
      });
      if (onLog) {
        onLog(method, `Error: ${err.message}`, { status: 500, duration: '0ms', size: 0 });
      }
    } finally {
      setExecuting(false);
    }
  }

  async function handleReset() {
    if (!window.confirm('Clear all sandbox test data?')) return;
    try {
      await sandboxApi.reset(projectId);
      if (onLog) onLog('SYSTEM', 'Sandbox data cleared', { status: 200, duration: '0ms', size: 0 });
    } catch {}
  }

  const currentSchema = schemas.find((s) => s.name === collection);
  const routeName = collection ? collection.toLowerCase() + 's' : '';
  const displayPath = docId ? `/api/${routeName}/${docId}` : `/api/${routeName}`;

  return (
    <div className="h-full flex">
      {/* Endpoint sidebar */}
      <EndpointSidebar
        schemas={crudSchemas}
        onSelect={handleSelectEndpoint}
        selectedPath={selectedPath}
      />

      {/* Main playground area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Request builder */}
        <div className="shrink-0 p-3 border-b border-zinc-800 space-y-3">
          {/* Method + URL bar */}
          <div className="flex gap-2">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className={`px-2 py-1.5 rounded-lg border text-xs font-bold shrink-0 focus:outline-none cursor-pointer ${METHOD_COLORS[method]}`}
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <div className="flex-1 flex items-center gap-0 bg-zinc-800 border border-zinc-700/50 rounded-lg overflow-hidden">
              <select
                value={collection}
                onChange={(e) => setCollection(e.target.value)}
                className="bg-transparent text-xs text-zinc-300 px-2 py-1.5 border-r border-zinc-700/50 focus:outline-none cursor-pointer"
              >
                {schemas.map((s) => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
              <span className="text-xs text-zinc-500 px-2 font-mono">{displayPath}</span>
              <input
                type="text"
                value={docId}
                onChange={(e) => setDocId(e.target.value)}
                placeholder="Document ID (optional)"
                className="flex-1 bg-transparent text-xs text-zinc-100 font-mono px-2 py-1.5 focus:outline-none placeholder:text-zinc-700"
              />
            </div>

            <button
              onClick={handleExecute}
              disabled={executing || !collection}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-40 shrink-0"
            >
              {executing ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Play size={12} />
              )}
              Send
            </button>

            <button
              onClick={handleReset}
              className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors"
              title="Reset sandbox data"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Request body (for POST/PUT/PATCH) */}
          {['POST', 'PUT', 'PATCH'].includes(method) && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileJson size={10} className="text-zinc-500" />
                <span className="text-[10px] text-zinc-500 uppercase tracking-wide">Request Body</span>
                {currentSchema && (
                  <span className="text-[10px] text-zinc-700">
                    ({(currentSchema.fields || []).map((f) => f.name).join(', ')})
                  </span>
                )}
              </div>
              <textarea
                value={bodyStr}
                onChange={(e) => setBodyStr(e.target.value)}
                rows={Math.min(bodyStr.split('\n').length + 1, 12)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 font-mono resize-none focus:border-blue-500/50 focus:outline-none"
                spellCheck={false}
              />
            </div>
          )}

          {/* Query params (for GET) */}
          {method === 'GET' && !docId && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wide">Query Parameters</span>
                <button
                  onClick={() => setQueryParams((p) => [...p, { key: '', value: '' }])}
                  className="text-[10px] text-zinc-600 hover:text-zinc-400 flex items-center gap-0.5"
                >
                  <Plus size={9} /> Add
                </button>
              </div>
              {queryParams.length > 0 && (
                <div className="space-y-1">
                  {queryParams.map((param, i) => (
                    <div key={i} className="flex gap-1">
                      <input
                        value={param.key}
                        onChange={(e) => {
                          const next = [...queryParams];
                          next[i] = { ...next[i], key: e.target.value };
                          setQueryParams(next);
                        }}
                        placeholder="key"
                        className="w-32 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-100 font-mono focus:outline-none focus:border-zinc-700"
                      />
                      <input
                        value={param.value}
                        onChange={(e) => {
                          const next = [...queryParams];
                          next[i] = { ...next[i], value: e.target.value };
                          setQueryParams(next);
                        }}
                        placeholder="value"
                        className="flex-1 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-100 font-mono focus:outline-none focus:border-zinc-700"
                      />
                      <button
                        onClick={() => setQueryParams((p) => p.filter((_, j) => j !== i))}
                        className="p-1 text-zinc-700 hover:text-red-400"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Response area */}
        <div className="flex-1 min-h-0 flex flex-col">
          {response ? (
            <>
              {/* Response header */}
              <div className="shrink-0 flex items-center gap-3 px-3 py-2 border-b border-zinc-800 bg-zinc-900/30">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${statusClass(response.status)}`}>
                  {response.status} {response.statusText}
                </span>
                <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                  <Clock size={9} />
                  {response.duration}
                </div>
                {response.size > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                    <HardDrive size={9} />
                    {response.size > 1024 ? `${(response.size / 1024).toFixed(1)} KB` : `${response.size} B`}
                  </div>
                )}
                <button
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(response.body, null, 2))}
                  className="ml-auto p-1 text-zinc-600 hover:text-zinc-400 transition-colors"
                  title="Copy response"
                >
                  <Copy size={11} />
                </button>
              </div>

              {/* Response tabs */}
              <div className="shrink-0 flex border-b border-zinc-800">
                {['body', 'headers'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setResponseTab(tab)}
                    className={`px-3 py-1.5 text-[10px] uppercase tracking-wide font-medium transition-colors border-b-2 ${
                      responseTab === tab
                        ? 'text-zinc-200 border-blue-500'
                        : 'text-zinc-600 border-transparent hover:text-zinc-400'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Response content */}
              <div className="flex-1 overflow-auto bg-zinc-950/50">
                {responseTab === 'body' && <JsonViewer data={response.body} />}
                {responseTab === 'headers' && (
                  <div className="p-3 space-y-1">
                    {Object.entries(response.headers || {}).map(([key, value]) => (
                      <div key={key} className="flex gap-2 text-xs font-mono">
                        <span className="text-blue-400">{key}:</span>
                        <span className="text-zinc-400">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Send size={32} className="mx-auto text-zinc-800 mb-2" />
                <p className="text-xs text-zinc-600">Send a request to see the response</p>
                <p className="text-[10px] text-zinc-700 mt-1">
                  Requests run in an isolated sandbox — your real data is safe
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
