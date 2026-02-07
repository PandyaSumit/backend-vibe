import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Plus, Database, Trash2, ArrowRight, Settings, Table2 } from 'lucide-react';
import { projects as projectsApi, schemas as schemasApi } from '../services/api';

const FIELD_TYPE_COLORS = {
  String: 'text-green-400',
  Number: 'text-yellow-400',
  Boolean: 'text-purple-400',
  Date: 'text-orange-400',
  ObjectId: 'text-blue-400',
  Array: 'text-cyan-400',
  Mixed: 'text-zinc-400',
};

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [schemaList, setSchemaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProject();
  }, [projectId]);

  async function loadProject() {
    try {
      const data = await projectsApi.get(projectId);
      setProject(data);
      setSchemaList(data.schemas || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteSchema(id) {
    if (!window.confirm('Delete this schema?')) return;
    try {
      await schemasApi.delete(id);
      setSchemaList((prev) => prev.filter((s) => s._id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="p-8 text-zinc-500 text-sm">Loading...</div>;
  if (!project) return <div className="p-8 text-red-400 text-sm">Project not found</div>;

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">{project.name}</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {project.description || 'Define your data models and generate production APIs.'}
          </p>
        </div>
        <Link
          to={`/project/${projectId}/schema/new`}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          New Schema
        </Link>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-900/30 border border-red-800 text-red-300 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Project info bar */}
      <div className="flex gap-4 mb-6 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-xs text-zinc-500">
        <span>
          <span className="text-zinc-400">Database:</span> {project.dbName || '—'}
        </span>
        <span>
          <span className="text-zinc-400">Port:</span> {project.port}
        </span>
        <span>
          <span className="text-zinc-400">Schemas:</span> {schemaList.length}
        </span>
      </div>

      {/* Schema list */}
      {schemaList.length === 0 ? (
        <div className="text-center py-20">
          <Table2 size={48} className="mx-auto text-zinc-700 mb-4" />
          <h3 className="text-lg font-medium text-zinc-400 mb-2">No schemas yet</h3>
          <p className="text-sm text-zinc-600 mb-6">
            Create your first data model to start building your backend.
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
  );
}
