import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Database, Trash2, Clock, Sparkles, ArrowRight, Layers } from 'lucide-react';
import { projects as projectsApi } from '../services/api';

export default function Dashboard() {
  const [projectList, setProjectList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', dbName: '', port: 3000 });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const data = await projectsApi.list();
      setProjectList(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      const project = await projectsApi.create(form);
      navigate(`/project/${project._id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this project and all its schemas?')) return;
    try {
      await projectsApi.delete(id);
      setProjectList((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  return (
    <div className="h-full bg-zinc-950">
      {/* Hero section */}
      <div className="border-b border-zinc-800/50 bg-gradient-to-b from-zinc-900/50 to-transparent">
        <div className="max-w-5xl mx-auto px-8 py-10">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/10">
                  <Layers size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-zinc-100">SchemaForge</h1>
                  <p className="text-xs text-zinc-500">Backend Vibe Coding Platform</p>
                </div>
              </div>
              <p className="text-sm text-zinc-400 max-w-lg">
                Design backends with natural language. Generate schemas, APIs, and production-ready code — then test everything in the built-in playground.
              </p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20"
            >
              <Plus size={16} />
              New Project
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-8 py-6">
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-900/30 border border-red-800 text-red-300 text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* Create modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-semibold text-zinc-100 mb-1">New Project</h2>
              <p className="text-xs text-zinc-500 mb-5">Set up your backend project — you can change these later.</p>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Project Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="My SaaS API"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
                    autoFocus
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Description</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Backend for my project"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">Database Name</label>
                    <input
                      type="text"
                      value={form.dbName}
                      onChange={(e) => setForm({ ...form, dbName: e.target.value })}
                      placeholder="my_saas_db"
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">Port</label>
                    <input
                      type="number"
                      value={form.port}
                      onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) || 3000 })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
                    Create Project
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Projects */}
        {loading ? (
          <div className="text-zinc-500 text-sm">Loading projects...</div>
        ) : projectList.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
              <Sparkles size={28} className="text-zinc-700" />
            </div>
            <h3 className="text-lg font-medium text-zinc-300 mb-2">No projects yet</h3>
            <p className="text-sm text-zinc-600 mb-6 max-w-sm mx-auto">
              Create your first project and use AI to generate an entire backend from a single prompt.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Get Started
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-zinc-400">
                {projectList.length} project{projectList.length !== 1 ? 's' : ''}
              </h2>
            </div>
            <div className="grid gap-2">
              {projectList.map((project) => (
                <div
                  key={project._id}
                  onClick={() => navigate(`/project/${project._id}`)}
                  className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl hover:border-zinc-700/50 hover:bg-zinc-900 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 group-hover:bg-zinc-700 transition-colors">
                      <Database size={16} className="text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-zinc-100 truncate">{project.name}</div>
                      <div className="text-[11px] text-zinc-600 mt-0.5 truncate">
                        {project.schemaCount || 0} schemas
                        {project.description && <span className="ml-1.5 text-zinc-700">— {project.description}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="text-[10px] text-zinc-700">{formatDate(project.updatedAt)}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(project._id); }}
                      className="p-1.5 text-zinc-700 hover:text-red-400 rounded transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={13} />
                    </button>
                    <ArrowRight size={14} className="text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
