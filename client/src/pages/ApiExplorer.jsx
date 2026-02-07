import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Zap, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { schemas as schemasApi } from '../services/api';

const METHOD_COLORS = {
  GET: 'bg-green-900/30 text-green-400 border-green-800',
  POST: 'bg-blue-900/30 text-blue-400 border-blue-800',
  PUT: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
  DELETE: 'bg-red-900/30 text-red-400 border-red-800',
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
    });
  }

  if (eps.create !== false) {
    const bodyFields = fields
      .map((f) => `  "${f.name}": <${f.fieldType}>${f.required ? ' // required' : ''}`)
      .join('\n');
    endpoints.push({
      method: 'POST',
      path: base,
      description: `Create a new ${schema.name}`,
      queryParams: [],
      body: `{\n${bodyFields}\n}`,
      response: `Created ${schema.name} object (201)`,
    });
  }

  if (eps.update !== false) {
    const bodyFields = fields.map((f) => `  "${f.name}": <${f.fieldType}>`).join('\n');
    endpoints.push({
      method: 'PUT',
      path: `${base}/:id`,
      description: `Update a ${schema.name} by ID`,
      queryParams: [],
      body: `{\n${bodyFields}\n}`,
      response: `Updated ${schema.name} object`,
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
    });
  }

  return endpoints;
}

function EndpointRow({ ep }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-900/50 transition-colors text-left"
      >
        <span
          className={`px-2 py-0.5 text-[10px] font-bold rounded border ${METHOD_COLORS[ep.method]}`}
        >
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
          {ep.queryParams.length > 0 && (
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">
                Query Parameters
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ep.queryParams.map((p) => (
                  <span
                    key={p}
                    className="px-2 py-0.5 bg-zinc-800 rounded text-xs font-mono text-zinc-400"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {ep.body && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wide">
                  Request Body
                </span>
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
        </div>
      )}
    </div>
  );
}

export default function ApiExplorer() {
  const { projectId } = useParams();
  const [schemaList, setSchemaList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchemas();
  }, [projectId]);

  async function loadSchemas() {
    try {
      const data = await schemasApi.listByProject(projectId);
      setSchemaList(data.filter((s) => s.generateCrud));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-8 text-zinc-500 text-sm">Loading...</div>;

  const totalEndpoints = schemaList.reduce(
    (sum, s) => sum + generateEndpoints(s).length,
    0
  );

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-100">API Explorer</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {totalEndpoints} endpoints across {schemaList.length} schema
          {schemaList.length !== 1 ? 's' : ''}
        </p>
      </div>

      {schemaList.length === 0 ? (
        <div className="text-center py-20">
          <Zap size={48} className="mx-auto text-zinc-700 mb-4" />
          <h3 className="text-lg font-medium text-zinc-400 mb-2">No API endpoints</h3>
          <p className="text-sm text-zinc-600">
            Create schemas with CRUD generation enabled to see endpoints here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
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
                    <EndpointRow key={i} ep={ep} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
