import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Database,
  Play,
  FileCode,
  BrainCircuit,
  Settings,
  ArrowLeft,
  Layers,
  Plus,
  List,
  Trash2,
  ArrowRight,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  projects as projectsApi,
  schemas as schemasApi,
  endpoints as endpointsApi,
  architecture as archApi,
} from '../services/api';
import useSettings from '../hooks/useSettings';
import useConsole from '../hooks/useConsole';
import CommandBar from '../components/CommandBar';
import ConsolePanel from '../components/ConsolePanel';
import SettingsDrawer from '../components/SettingsDrawer';
import SchemaCanvas from '../components/SchemaCanvas';
import Playground from '../components/Playground';
import CodeView from '../components/CodeView';
import EndpointBuilder from '../pages/EndpointBuilder';

const TABS = [
  { id: 'schemas', label: 'Schemas', icon: Database },
  { id: 'playground', label: 'Playground', icon: Play },
  { id: 'code', label: 'Code', icon: FileCode },
  { id: 'endpoints', label: 'AI Endpoints', icon: BrainCircuit },
];

const FIELD_TYPE_COLORS = {
  String: 'text-green-400',
  Number: 'text-yellow-400',
  Boolean: 'text-purple-400',
  Date: 'text-orange-400',
  ObjectId: 'text-blue-400',
  Array: 'text-cyan-400',
  Mixed: 'text-zinc-400',
};

export default function ProjectWorkspace() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const settingsHook = useSettings(projectId);
  const console = useConsole();

  const [project, setProject] = useState(null);
  const [schemaList, setSchemaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [activeTab, setActiveTab] = useState('schemas');
  const [showSettings, setShowSettings] = useState(false);

  // Schema view mode: 'list' or 'canvas'
  const [schemaView, setSchemaView] = useState('list');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [entities, setEntities] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  async function loadProject() {
    try {
      const [proj, schemas] = await Promise.all([
        projectsApi.get(projectId),
        schemasApi.listByProject(projectId),
      ]);
      setProject(proj);
      setSchemaList(schemas);
      if (schemas.length > 0) buildCanvasFromSchemas(schemas);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function buildCanvasFromSchemas(schemas) {
    const ents = schemas.map((s, idx) => ({
      name: s.name,
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
          if (schemas.find((t) => t.name === f.ref)) {
            rels.push({ from: s.name, fromField: f.name, to: f.ref, type: 'many-to-one', label: f.name });
          }
        }
      });
    });
    setEntities(ents);
    setRelationships(rels);
  }

  async function handleGenerate(prompt) {
    if (!settingsHook.hasKey) {
      setShowSettings(true);
      setError('Configure your Groq API key first');
      return;
    }
    setGenerating(true);
    setError('');
    setSuccess('');
    setWarnings([]);
    console.logInfo(`Generating architecture: "${prompt}"`);

    try {
      const data = await archApi.generate({ projectId, prompt });
      setEntities(data.entities || []);
      setRelationships(data.relationships || []);
      setWarnings(data.warnings || []);
      setSchemaView('canvas');
      console.logSuccess(`Architecture generated: ${(data.entities || []).length} entities`);
    } catch (err) {
      setError(err.message);
      console.logError(`Generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveArchitecture() {
    if (entities.length === 0) return;
    setSaving(true);
    setError('');
    console.logInfo('Saving schemas...');

    try {
      const result = await archApi.save({ projectId, entities });
      setSuccess(result.message || `${entities.length} schemas saved`);
      const updated = await schemasApi.listByProject(projectId);
      setSchemaList(updated);
      console.logSuccess(`${entities.length} schemas saved`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message);
      console.logError(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSchema(id) {
    if (!window.confirm('Delete this schema?')) return;
    try {
      await schemasApi.delete(id);
      const updated = schemaList.filter((s) => s._id !== id);
      setSchemaList(updated);
      if (updated.length > 0) buildCanvasFromSchemas(updated);
      else { setEntities([]); setRelationships([]); }
      console.logSuccess('Schema deleted');
    } catch (err) {
      setError(err.message);
    }
  }

  function handlePlaygroundLog(method, path, response) {
    console.logRequest(method, path, response);
  }

  if (loading) return <div className="h-screen flex items-center justify-center text-zinc-500 text-sm">Loading workspace...</div>;
  if (!project) return <div className="h-screen flex items-center justify-center text-red-400 text-sm">Project not found</div>;

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      {/* Top bar */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900/80">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <Layers size={12} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-zinc-200">{project.name}</span>
            <span className="text-[10px] text-zinc-600">{schemaList.length} schemas</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0.5 bg-zinc-800/50 rounded-lg p-0.5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === tab.id
                    ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Icon size={12} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px]">
            <span className="text-zinc-600">API Key:</span>
            {settingsHook.hasKey ? (
              <span className="text-green-500">active</span>
            ) : (
              <button onClick={() => setShowSettings(true)} className="text-yellow-500 hover:text-yellow-400">setup</button>
            )}
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 text-zinc-600 hover:text-zinc-400 transition-colors"
            title="Settings"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Command bar (visible in schemas tab) */}
      {activeTab === 'schemas' && (
        <div className="shrink-0 px-3 py-2 border-b border-zinc-800/50 bg-zinc-900/30">
          <div className="flex items-center gap-2">
            <CommandBar
              onGenerate={handleGenerate}
              generating={generating}
              placeholder="Describe your backend... e.g., 'E-commerce with users, products, orders'"
              buttonLabel="Generate"
              compact
            />
            {entities.length > 0 && (
              <button
                onClick={handleSaveArchitecture}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-40 shrink-0"
              >
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                Save
              </button>
            )}
            {/* View toggle */}
            <div className="flex bg-zinc-800 rounded-md p-0.5 shrink-0">
              <button
                onClick={() => setSchemaView('list')}
                className={`px-2 py-1 text-[10px] rounded transition-colors ${schemaView === 'list' ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <List size={11} />
              </button>
              <button
                onClick={() => setSchemaView('canvas')}
                className={`px-2 py-1 text-[10px] rounded transition-colors ${schemaView === 'canvas' ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Layers size={11} />
              </button>
            </div>
            <Link
              to={`/project/${projectId}/schema/new`}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium rounded-lg transition-colors shrink-0"
            >
              <Plus size={11} />
              Schema
            </Link>
          </div>

          {/* Status messages */}
          {error && (
            <div className="mt-2 px-3 py-1.5 bg-red-900/30 border border-red-800 text-red-300 text-xs rounded flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError('')}><X size={10} /></button>
            </div>
          )}
          {success && (
            <div className="mt-2 px-3 py-1.5 bg-green-900/30 border border-green-800 text-green-300 text-xs rounded flex items-center gap-1.5">
              <CheckCircle2 size={10} /> {success}
            </div>
          )}
          {warnings.length > 0 && (
            <div className="mt-2 px-3 py-1.5 bg-yellow-900/20 border border-yellow-800/50 text-yellow-300 text-xs rounded">
              <AlertTriangle size={10} className="inline mr-1" />
              {warnings.length} warning{warnings.length > 1 ? 's' : ''}: {warnings[0]}
            </div>
          )}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'schemas' && (
          schemaView === 'list' ? (
            <div className="h-full overflow-auto p-4">
              {schemaList.length === 0 ? (
                <div className="text-center py-20">
                  <Database size={40} className="mx-auto text-zinc-800 mb-3" />
                  <h3 className="text-base font-medium text-zinc-400 mb-2">No schemas yet</h3>
                  <p className="text-xs text-zinc-600 mb-4">Use the AI prompt bar above or create one manually.</p>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto grid gap-2">
                  {schemaList.map((schema) => (
                    <div
                      key={schema._id}
                      onClick={() => navigate(`/project/${projectId}/schema/${schema._id}`)}
                      className="p-3 bg-zinc-900/50 border border-zinc-800/50 rounded-lg hover:border-zinc-700/50 cursor-pointer transition-all group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Database size={14} className="text-blue-400" />
                          <span className="font-medium text-sm text-zinc-100">{schema.name}</span>
                          {schema.generateCrud && (
                            <span className="px-1.5 py-0.5 text-[9px] font-medium bg-green-900/30 text-green-400 rounded">CRUD</span>
                          )}
                          <span className="text-[10px] text-zinc-600">{(schema.fields || []).length} fields</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteSchema(schema._id); }}
                            className="p-1 text-zinc-700 hover:text-red-400 rounded transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={12} />
                          </button>
                          <ArrowRight size={12} className="text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(schema.fields || []).slice(0, 10).map((field) => (
                          <span key={field._id || field.name} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-zinc-800/50 rounded text-[10px]">
                            <span className="text-zinc-400">{field.name}</span>
                            <span className={FIELD_TYPE_COLORS[field.fieldType] || 'text-zinc-500'}>{field.fieldType}</span>
                          </span>
                        ))}
                        {(schema.fields || []).length > 10 && (
                          <span className="text-[10px] text-zinc-700">+{schema.fields.length - 10}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex">
              <div className="flex-1 min-w-0">
                <SchemaCanvas
                  entities={entities}
                  relationships={relationships}
                  onEntitySelect={setSelectedEntity}
                  selectedEntity={selectedEntity}
                />
              </div>
              {selectedEntity && (() => {
                const ent = entities.find((e) => e.name === selectedEntity);
                if (!ent) return null;
                return (
                  <div className="w-64 shrink-0 border-l border-zinc-800 bg-zinc-900/50 overflow-auto">
                    <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
                      <h3 className="text-xs font-medium text-zinc-200">{ent.name}</h3>
                      <button onClick={() => setSelectedEntity(null)} className="p-1 text-zinc-600 hover:text-zinc-300"><X size={10} /></button>
                    </div>
                    <div className="p-2 space-y-1">
                      {(ent.fields || []).map((f) => (
                        <div key={f.name} className="px-2 py-1 bg-zinc-800/30 rounded text-[10px] flex items-center justify-between">
                          <span className="font-mono text-zinc-300">{f.name}{f.required ? '*' : ''}</span>
                          <span className="text-zinc-600 font-mono">{f.fieldType}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )
        )}

        {activeTab === 'playground' && (
          <Playground projectId={projectId} schemas={schemaList} onLog={handlePlaygroundLog} />
        )}

        {activeTab === 'code' && (
          <CodeView projectId={projectId} />
        )}

        {activeTab === 'endpoints' && (
          <div className="h-full overflow-auto">
            <EndpointBuilder />
          </div>
        )}
      </div>

      {/* Console panel */}
      <ConsolePanel
        logs={console.logs}
        isOpen={console.isOpen}
        onToggle={() => console.setIsOpen(!console.isOpen)}
        onClear={console.clearLogs}
      />

      {/* Settings drawer */}
      <SettingsDrawer open={showSettings} onClose={() => setShowSettings(false)} settings={settingsHook} />
    </div>
  );
}
