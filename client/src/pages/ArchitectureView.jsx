import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Loader2,
  Send,
  Save,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Trash2,
  X,
} from 'lucide-react';
import { schemas as schemasApi, architecture as archApi } from '../services/api';
import SchemaCanvas from '../components/SchemaCanvas';

const EXAMPLE_PROMPTS = [
  'E-commerce platform with users, products, orders, reviews, and categories',
  'SaaS project management tool with workspaces, projects, tasks, and team members',
  'Social media backend with users, posts, comments, likes, and followers',
  'Online learning platform with courses, lessons, enrollments, and instructors',
  'Multi-tenant CRM with companies, contacts, deals, and activities',
];

export default function ArchitectureView() {
  const { projectId } = useParams();
  const [prompt, setPrompt] = useState('');
  const [groqApiKey, setGroqApiKey] = useState(() => localStorage.getItem('groq_api_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Architecture state
  const [entities, setEntities] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);

  // Load existing schemas as entities on mount
  useEffect(() => {
    loadExistingSchemas();
  }, [projectId]);

  async function loadExistingSchemas() {
    try {
      const schemaList = await schemasApi.listByProject(projectId);
      if (schemaList.length > 0) {
        const ents = schemaList.map((s, idx) => ({
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

        // Infer relationships from ObjectId refs
        const rels = [];
        schemaList.forEach((s) => {
          (s.fields || []).forEach((f) => {
            if (f.fieldType === 'ObjectId' && f.ref) {
              const target = schemaList.find((t) => t.name === f.ref);
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

        setEntities(ents);
        setRelationships(rels);
        setHasGenerated(true);
      }
    } catch (err) {
      // non-critical
    }
  }

  function handleKeyChange(key) {
    setGroqApiKey(key);
    localStorage.setItem('groq_api_key', key);
  }

  async function handleGenerate(e) {
    e.preventDefault();
    if (!prompt.trim()) return;
    if (!groqApiKey.trim()) {
      setShowKeyInput(true);
      setError('Enter your Groq API key first');
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
        groqApiKey: groqApiKey.trim(),
      });

      setEntities(data.entities || []);
      setRelationships(data.relationships || []);
      setWarnings(data.warnings || []);
      setHasGenerated(true);
      setSelectedEntity(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (entities.length === 0) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const result = await archApi.save({
        projectId,
        entities,
      });
      setSuccess(result.message || `${entities.length} schemas saved to project`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleRemoveEntity(name) {
    setEntities((prev) => prev.filter((e) => e.name !== name));
    setRelationships((prev) => prev.filter((r) => r.from !== name && r.to !== name));
    if (selectedEntity === name) setSelectedEntity(null);
  }

  const selectedEntityData = entities.find((e) => e.name === selectedEntity);

  return (
    <div className="h-full flex flex-col">
      {/* Top bar with prompt */}
      <div className="shrink-0 p-4 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers size={20} className="text-indigo-400" />
            <h1 className="text-lg font-semibold text-zinc-100">Architecture Designer</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              API Key {groqApiKey ? '(set)' : '(required)'}
            </button>
            {hasGenerated && entities.length > 0 && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
              >
                <Save size={12} />
                {saving ? 'Saving...' : 'Save All Schemas'}
              </button>
            )}
          </div>
        </div>

        {showKeyInput && (
          <div className="mb-3">
            <input
              type="password"
              value={groqApiKey}
              onChange={(e) => handleKeyChange(e.target.value)}
              placeholder="gsk_..."
              className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-100 font-mono focus:border-indigo-500 focus:outline-none"
            />
          </div>
        )}

        <form onSubmit={handleGenerate} className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your backend... e.g., 'E-commerce with users, products, orders, and reviews'"
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none placeholder:text-zinc-600 pr-24"
            />
            <button
              type="submit"
              disabled={generating || !prompt.trim()}
              className="absolute right-1.5 top-1.5 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-40"
            >
              {generating ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Send size={12} />
              )}
              {generating ? 'Designing...' : 'Generate'}
            </button>
          </div>
        </form>

        {/* Example prompts */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {EXAMPLE_PROMPTS.slice(0, 3).map((ex) => (
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

      {/* Canvas + detail panel */}
      <div className="flex-1 flex min-h-0">
        {/* Canvas */}
        <div className="flex-1 min-w-0">
          <SchemaCanvas
            entities={entities}
            relationships={relationships}
            onEntitySelect={setSelectedEntity}
            selectedEntity={selectedEntity}
          />
        </div>

        {/* Detail panel (shows when entity selected) */}
        {selectedEntityData && (
          <div className="w-72 shrink-0 border-l border-zinc-800 bg-zinc-900/50 overflow-auto">
            <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-200">{selectedEntityData.name}</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleRemoveEntity(selectedEntityData.name)}
                  className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                  title="Remove entity"
                >
                  <Trash2 size={12} />
                </button>
                <button
                  onClick={() => setSelectedEntity(null)}
                  className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            </div>

            <div className="p-3 space-y-3">
              {/* Entity info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {selectedEntityData.generateCrud && (
                    <span className="px-1.5 py-0.5 text-[9px] font-medium bg-green-900/30 text-green-400 rounded">CRUD</span>
                  )}
                  {selectedEntityData.timestamps && (
                    <span className="px-1.5 py-0.5 text-[9px] font-medium bg-zinc-800 text-zinc-400 rounded">Timestamps</span>
                  )}
                </div>
              </div>

              {/* Fields list */}
              <div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2">
                  Fields ({(selectedEntityData.fields || []).length})
                </div>
                <div className="space-y-1">
                  {(selectedEntityData.fields || []).map((field) => (
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
                        {field.fieldType}
                        {field.ref ? ` -> ${field.ref}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Relationships */}
              {(() => {
                const rels = (relationships || []).filter(
                  (r) => r.from === selectedEntityData.name || r.to === selectedEntityData.name
                );
                if (rels.length === 0) return null;
                return (
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2">
                      Relationships ({rels.length})
                    </div>
                    <div className="space-y-1">
                      {rels.map((rel, i) => (
                        <div key={i} className="px-2 py-1.5 bg-zinc-800/50 rounded text-xs text-zinc-400">
                          <span className="text-blue-400">{rel.from}</span>
                          <span className="text-zinc-600 mx-1">-{'>'}</span>
                          <span className="text-blue-400">{rel.to}</span>
                          <span className="text-zinc-600 ml-1">({rel.type})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
