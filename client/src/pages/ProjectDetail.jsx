import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Plus,
  Database,
  Trash2,
  ArrowRight,
  Table2,
  Layers,
  List,
  Send,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Settings,
  X,
} from 'lucide-react';
import {
  projects as projectsApi,
  schemas as schemasApi,
  architecture as archApi,
} from '../services/api';
import SchemaCanvas from '../components/SchemaCanvas';
import SettingsDrawer from '../components/SettingsDrawer';
import useSettings from '../hooks/useSettings';

const FIELD_TYPE_COLORS = {
  String: 'text-green-400',
  Number: 'text-yellow-400',
  Boolean: 'text-purple-400',
  Date: 'text-orange-400',
  ObjectId: 'text-blue-400',
  Array: 'text-cyan-400',
  Mixed: 'text-zinc-400',
};

const EXAMPLE_PROMPTS = [
  'E-commerce platform with users, products, orders, reviews, and categories',
  'SaaS project management tool with workspaces, projects, tasks, and team members',
  'Social media backend with users, posts, comments, likes, and followers',
];

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const settings = useSettings(projectId);

  const [project, setProject] = useState(null);
  const [schemaList, setSchemaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // View toggle: 'list' or 'canvas'
  const [view, setView] = useState('list');

  // AI generation state
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiEntities, setAiEntities] = useState([]);
  const [aiRelationships, setAiRelationships] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [hasAiResult, setHasAiResult] = useState(false);
  const [success, setSuccess] = useState('');
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  async function loadProject() {
    try {
      const [proj, schemaData] = await Promise.all([
        projectsApi.get(projectId),
        schemasApi.listByProject(projectId),
      ]);
      setProject(proj);
      setSchemaList(schemaData);

      // Build canvas entities from existing schemas
      if (schemaData.length > 0) {
        buildCanvasFromSchemas(schemaData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function buildCanvasFromSchemas(schemas) {
    const ents = schemas.map((s, idx) => ({
      name: s.name,
      description: '',
      collectionName: s.collectionName || '',
      timestamps: s.timestamps,
      generateCrud: s.generateCrud,
      fields: s.fields || [],
      canvas: {
        x: (idx % 3) * 320,
        y: Math.floor(idx / 3) * 280,
        width: 280,
        height: 120 + (s.fields || []).length * 32,
      },
    }));

    const rels = [];
    schemas.forEach((s) => {
      (s.fields || []).forEach((f) => {
        if (f.fieldType === 'ObjectId' && f.ref) {
          const target = schemas.find((t) => t.name === f.ref);
          if (target) {
            rels.push({
              from: s.name,
              fromField: f.name,
              to: f.ref,
              type: 'many-to-one',
              label: f.name,
            });
          }
        }
      });
    });

    setAiEntities(ents);
    setAiRelationships(rels);
    setHasAiResult(true);
  }

  async function handleDeleteSchema(id) {
    if (!window.confirm('Delete this schema?')) return;
    try {
      await schemasApi.delete(id);
      const updated = schemaList.filter((s) => s._id !== id);
      setSchemaList(updated);
      if (updated.length > 0) buildCanvasFromSchemas(updated);
      else {
        setAiEntities([]);
        setAiRelationships([]);
        setHasAiResult(false);
      }
    } catch (err) {
      setError(err.message);
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

    setGenerating(true);
    setError('');
    setSuccess('');
    setWarnings([]);

    try {
      const data = await archApi.generate({
        projectId,
        prompt: prompt.trim(),
      });
      setAiEntities(data.entities || []);
      setAiRelationships(data.relationships || []);
      setWarnings(data.warnings || []);
      setHasAiResult(true);
      setSelectedEntity(null);
      setView('canvas');
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveArchitecture() {
    if (aiEntities.length === 0) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const result = await archApi.save({ projectId, entities: aiEntities });
      setSuccess(result.message || `${aiEntities.length} schemas saved`);
      // Reload schemas
      const updated = await schemasApi.listByProject(projectId);
      setSchemaList(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8 text-zinc-500 text-sm">Loading...</div>;
  if (!project) return <div className="p-8 text-red-400 text-sm">Project not found</div>;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">{project.name}</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              {project.description || 'Define your data models and generate production APIs.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Project Settings"
            >
              <Settings size={16} />
            </button>

            {/* View toggle */}
            <div className="flex bg-zinc-800 rounded-lg p-0.5">
              <button
                onClick={() => setView('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
                  view === 'list'
                    ? 'bg-zinc-700 text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <List size={12} />
                List
              </button>
              <button
                onClick={() => setView('canvas')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
                  view === 'canvas'
                    ? 'bg-zinc-700 text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Layers size={12} />
                Canvas
              </button>
            </div>

            <Link
              to={`/project/${projectId}/schema/new`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <Plus size={14} />
              New Schema
            </Link>
          </div>
        </div>

        {/* AI prompt bar */}
        <form onSubmit={handleGenerate} className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your backend... e.g., 'E-commerce with users, products, orders, and reviews'"
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none placeholder:text-zinc-600 pr-24"
            />
            <button
              type="submit"
              disabled={generating || !prompt.trim()}
              className="absolute right-1.5 top-1 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-40"
            >
              {generating ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Send size={12} />
              )}
              {generating ? 'Designing...' : 'Generate'}
            </button>
          </div>
          {hasAiResult && aiEntities.length > 0 && (
            <button
              type="button"
              onClick={handleSaveArchitecture}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
            >
              <Save size={12} />
              {saving ? 'Saving...' : 'Save All'}
            </button>
          )}
        </form>

        {/* Example prompts */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {EXAMPLE_PROMPTS.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setPrompt(ex)}
              className="px-2 py-0.5 text-[10px] text-zinc-600 hover:text-zinc-400 bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 rounded transition-colors truncate max-w-[280px]"
            >
              {ex}
            </button>
          ))}
        </div>

        {/* Project info bar */}
        <div className="flex gap-4 mt-3 text-[10px] text-zinc-600">
          <span>
            <span className="text-zinc-500">DB:</span> {project.dbName || '—'}
          </span>
          <span>
            <span className="text-zinc-500">Port:</span> {project.port}
          </span>
          <span>
            <span className="text-zinc-500">Schemas:</span> {schemaList.length}
          </span>
          <span>
            <span className="text-zinc-500">API Key:</span>{' '}
            {settings.hasKey ? (
              <span className="text-green-500">configured</span>
            ) : (
              <button
                onClick={() => setShowSettings(true)}
                className="text-yellow-500 hover:text-yellow-400"
              >
                not set
              </button>
            )}
          </span>
        </div>

        {/* Status messages */}
        {error && (
          <div className="mt-2 px-3 py-2 bg-red-900/30 border border-red-800 text-red-300 text-xs rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-200 ml-2">
              <X size={12} />
            </button>
          </div>
        )}
        {success && (
          <div className="mt-2 px-3 py-2 bg-green-900/30 border border-green-800 text-green-300 text-xs rounded-lg flex items-center gap-2">
            <CheckCircle2 size={12} />
            {success}
          </div>
        )}
        {warnings.length > 0 && (
          <div className="mt-2 px-3 py-2 bg-yellow-900/20 border border-yellow-800/50 text-yellow-300 text-xs rounded-lg">
            <div className="flex items-center gap-1 mb-1 font-medium">
              <AlertTriangle size={10} /> {warnings.length} warning{warnings.length > 1 ? 's' : ''}
            </div>
            {warnings.slice(0, 3).map((w, i) => (
              <div key={i} className="text-yellow-400/70">{w}</div>
            ))}
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 flex">
        {view === 'list' ? (
          /* List view */
          <div className="flex-1 overflow-auto p-4 max-w-5xl">
            {schemaList.length === 0 ? (
              <div className="text-center py-20">
                <Table2 size={48} className="mx-auto text-zinc-700 mb-4" />
                <h3 className="text-lg font-medium text-zinc-400 mb-2">No schemas yet</h3>
                <p className="text-sm text-zinc-600 mb-6">
                  Use the AI prompt above to generate schemas, or create one manually.
                </p>
                <Link
                  to={`/project/${projectId}/schema/new`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  Create Schema
                </Link>
              </div>
            ) : (
              <div className="grid gap-3">
                {schemaList.map((schema) => (
                  <div
                    key={schema._id}
                    onClick={() => navigate(`/project/${projectId}/schema/${schema._id}`)}
                    className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Database size={16} className="text-blue-400" />
                        <span className="font-medium text-sm text-zinc-100">{schema.name}</span>
                        {schema.generateCrud && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-900/30 text-green-400 rounded">
                            CRUD
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSchema(schema._id);
                          }}
                          className="p-1.5 text-zinc-600 hover:text-red-400 rounded transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                        <ArrowRight
                          size={14}
                          className="text-zinc-600 group-hover:text-zinc-400 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Field preview */}
                    <div className="flex flex-wrap gap-2">
                      {(schema.fields || []).slice(0, 8).map((field) => (
                        <span
                          key={field._id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-800 rounded text-xs"
                        >
                          <span className="text-zinc-400">{field.name}</span>
                          <span className={FIELD_TYPE_COLORS[field.fieldType] || 'text-zinc-500'}>
                            {field.fieldType}
                          </span>
                          {field.required && <span className="text-red-400">*</span>}
                        </span>
                      ))}
                      {(schema.fields || []).length > 8 && (
                        <span className="text-xs text-zinc-600">
                          +{schema.fields.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Canvas view */
          <div className="flex-1 min-w-0 flex">
            <div className="flex-1 min-w-0">
              <SchemaCanvas
                entities={aiEntities}
                relationships={aiRelationships}
                onEntitySelect={setSelectedEntity}
                selectedEntity={selectedEntity}
              />
            </div>

            {/* Entity detail panel */}
            {selectedEntity && (() => {
              const ent = aiEntities.find((e) => e.name === selectedEntity);
              if (!ent) return null;
              return (
                <div className="w-72 shrink-0 border-l border-zinc-800 bg-zinc-900/50 overflow-auto">
                  <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-zinc-200">{ent.name}</h3>
                    <button
                      onClick={() => setSelectedEntity(null)}
                      className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div className="p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      {ent.generateCrud && (
                        <span className="px-1.5 py-0.5 text-[9px] font-medium bg-green-900/30 text-green-400 rounded">
                          CRUD
                        </span>
                      )}
                      {ent.timestamps && (
                        <span className="px-1.5 py-0.5 text-[9px] font-medium bg-zinc-800 text-zinc-400 rounded">
                          Timestamps
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2">
                        Fields ({(ent.fields || []).length})
                      </div>
                      <div className="space-y-1">
                        {(ent.fields || []).map((field) => (
                          <div
                            key={field.name}
                            className="px-2 py-1.5 bg-zinc-800/50 rounded text-xs flex items-center justify-between"
                          >
                            <div className="flex items-center gap-1.5">
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${
                                  field.fieldType === 'String' ? 'bg-green-400' :
                                  field.fieldType === 'Number' ? 'bg-yellow-400' :
                                  field.fieldType === 'Boolean' ? 'bg-purple-400' :
                                  field.fieldType === 'Date' ? 'bg-orange-400' :
                                  field.fieldType === 'ObjectId' ? 'bg-blue-400' :
                                  field.fieldType === 'Array' ? 'bg-cyan-400' : 'bg-zinc-400'
                                }`}
                              />
                              <span className="font-mono text-zinc-300">{field.name}</span>
                              {field.required && <span className="text-red-400">*</span>}
                            </div>
                            <span className="text-zinc-600 font-mono">
                              {field.fieldType}{field.ref ? ` -> ${field.ref}` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Settings Drawer */}
      <SettingsDrawer open={showSettings} onClose={() => setShowSettings(false)} settings={settings} />
    </div>
  );
}
