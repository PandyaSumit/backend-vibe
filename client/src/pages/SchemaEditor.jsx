import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Save, Eye, ArrowLeft } from 'lucide-react';
import { schemas as schemasApi } from '../services/api';
import FieldEditor from '../components/FieldEditor';
import CodePreview from '../components/CodePreview';

const DEFAULT_FIELD = {
  name: '',
  fieldType: 'String',
  required: false,
  unique: false,
  default: '',
  ref: '',
  enumValues: [],
  description: '',
};

export default function SchemaEditor() {
  const { projectId, schemaId } = useParams();
  const navigate = useNavigate();
  const isNew = !schemaId;

  const [name, setName] = useState('');
  const [collectionName, setCollectionName] = useState('');
  const [timestamps, setTimestamps] = useState(true);
  const [generateCrud, setGenerateCrud] = useState(true);
  const [endpoints, setEndpoints] = useState({
    getAll: true,
    getById: true,
    create: true,
    update: true,
    delete: true,
  });
  const [fields, setFields] = useState([]);
  const [allSchemaNames, setAllSchemaNames] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    loadSchemaNames();
    if (!isNew) loadSchema();
  }, [schemaId]);

  async function loadSchemaNames() {
    try {
      const schemas = await schemasApi.listByProject(projectId);
      setAllSchemaNames(schemas.map((s) => s.name).filter((n) => n !== name));
    } catch (err) {
      // non-critical
    }
  }

  async function loadSchema() {
    try {
      const data = await schemasApi.get(schemaId);
      setName(data.name);
      setCollectionName(data.collectionName || '');
      setTimestamps(data.timestamps);
      setGenerateCrud(data.generateCrud);
      setEndpoints(data.endpoints || {});
      setFields(data.fields || []);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Schema name is required');
      return;
    }
    if (fields.some((f) => !f.name.trim())) {
      setError('All fields must have a name');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const data = {
        project: projectId,
        name: name.trim(),
        collectionName,
        timestamps,
        generateCrud,
        endpoints,
        fields: fields.map((f) => ({
          ...f,
          name: f.name.trim(),
        })),
      };

      if (isNew) {
        const created = await schemasApi.create(data);
        navigate(`/project/${projectId}/schema/${created._id}`, { replace: true });
      } else {
        await schemasApi.update(schemaId, data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    if (isNew) {
      setError('Save the schema first to preview code');
      return;
    }
    setPreviewLoading(true);
    try {
      const data = await schemasApi.preview(schemaId);
      setPreview(data);
      setShowPreview(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setPreviewLoading(false);
    }
  }

  function addField() {
    setFields([...fields, { ...DEFAULT_FIELD }]);
  }

  function updateField(index, updated) {
    setFields(fields.map((f, i) => (i === index ? updated : f)));
  }

  function removeField(index) {
    setFields(fields.filter((_, i) => i !== index));
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(`/project/${projectId}`)}
          className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-zinc-100">
            {isNew ? 'New Schema' : `Edit: ${name}`}
          </h1>
        </div>
        <button
          onClick={handlePreview}
          disabled={isNew || previewLoading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-colors disabled:opacity-40"
        >
          <Eye size={14} />
          Preview Code
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
        >
          <Save size={14} />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-900/30 border border-red-800 text-red-300 text-sm rounded-lg">
          {error}
          <button onClick={() => setError('')} className="float-right text-red-400 hover:text-red-200">
            x
          </button>
        </div>
      )}

      {/* Schema config */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Schema Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="User, Product, Order..."
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 font-mono focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Collection Name (optional)</label>
          <input
            type="text"
            value={collectionName}
            onChange={(e) => setCollectionName(e.target.value)}
            placeholder="Auto-generated from name"
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 font-mono focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Options */}
      <div className="flex gap-6 mb-6 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
        <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
          <input
            type="checkbox"
            checked={timestamps}
            onChange={(e) => setTimestamps(e.target.checked)}
            className="rounded border-zinc-600 bg-zinc-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
          />
          Timestamps (createdAt, updatedAt)
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
          <input
            type="checkbox"
            checked={generateCrud}
            onChange={(e) => setGenerateCrud(e.target.checked)}
            className="rounded border-zinc-600 bg-zinc-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
          />
          Generate CRUD API Routes
        </label>
      </div>

      {/* Endpoint toggles */}
      {generateCrud && (
        <div className="flex gap-4 mb-6 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
          <span className="text-xs text-zinc-500 self-center mr-2">Endpoints:</span>
          {[
            { key: 'getAll', label: 'GET /', method: 'GET' },
            { key: 'getById', label: 'GET /:id', method: 'GET' },
            { key: 'create', label: 'POST /', method: 'POST' },
            { key: 'update', label: 'PUT /:id', method: 'PUT' },
            { key: 'delete', label: 'DELETE /:id', method: 'DEL' },
          ].map((ep) => (
            <label
              key={ep.key}
              className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={endpoints[ep.key] !== false}
                onChange={(e) => setEndpoints({ ...endpoints, [ep.key]: e.target.checked })}
                className="rounded border-zinc-600 bg-zinc-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
              />
              <span className="font-mono">{ep.label}</span>
            </label>
          ))}
        </div>
      )}

      {/* Fields */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-300">
          Fields ({fields.length})
        </h2>
        <button
          onClick={addField}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-400 hover:text-blue-300 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-colors"
        >
          <Plus size={14} />
          Add Field
        </button>
      </div>

      <div className="space-y-2 mb-6">
        {fields.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-zinc-800 rounded-lg">
            <p className="text-sm text-zinc-600 mb-3">No fields defined yet</p>
            <button
              onClick={addField}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              + Add your first field
            </button>
          </div>
        ) : (
          fields.map((field, index) => (
            <FieldEditor
              key={index}
              field={field}
              index={index}
              allSchemas={allSchemaNames}
              onChange={updateField}
              onRemove={removeField}
            />
          ))
        )}
      </div>

      {fields.length > 0 && (
        <button
          onClick={addField}
          className="w-full py-2 border border-dashed border-zinc-800 rounded-lg text-xs text-zinc-600 hover:text-zinc-400 hover:border-zinc-700 transition-colors"
        >
          + Add Field
        </button>
      )}

      {/* Code preview modal */}
      {showPreview && preview && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-semibold text-zinc-100">Generated Code Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                x
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 space-y-4">
              {preview.model && (
                <CodePreview
                  filename={preview.model.filename}
                  code={preview.model.code}
                  language="javascript"
                />
              )}
              {preview.route && (
                <CodePreview
                  filename={preview.route.filename}
                  code={preview.route.code}
                  language="javascript"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
