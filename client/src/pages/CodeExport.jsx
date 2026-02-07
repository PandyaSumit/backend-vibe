import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Download, FileCode, FolderTree, Package } from 'lucide-react';
import { generate } from '../services/api';
import CodePreview from '../components/CodePreview';

export default function CodeExport() {
  const { projectId } = useParams();
  const [files, setFiles] = useState([]);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');

  async function handleGenerate() {
    setLoading(true);
    setError('');
    try {
      const data = await generate.project(projectId);
      setFiles(data.files);
      setProjectName(data.project);
      setGenerated(true);
      if (data.files.length > 0) setSelectedFile(0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    window.open(generate.downloadUrl(projectId), '_blank');
  }

  // Group files by directory
  function groupFiles(files) {
    const groups = {};
    files.forEach((file, index) => {
      const dir = file.path.includes('/') ? file.path.split('/')[0] : '.';
      if (!groups[dir]) groups[dir] = [];
      groups[dir].push({ ...file, index });
    });
    return groups;
  }

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Export Code</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Generate production-ready Node.js + Express + Mongoose code.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            <FileCode size={16} />
            {loading ? 'Generating...' : generated ? 'Regenerate' : 'Generate Code'}
          </button>
          {generated && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-lg border border-zinc-700 transition-colors"
            >
              <Download size={16} />
              Download ZIP
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-900/30 border border-red-800 text-red-300 text-sm rounded-lg">
          {error}
        </div>
      )}

      {!generated ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Package size={64} className="mx-auto text-zinc-800 mb-4" />
            <h3 className="text-lg font-medium text-zinc-400 mb-2">Ready to export</h3>
            <p className="text-sm text-zinc-600 max-w-md mb-6">
              Generate a complete Node.js backend project with Express routes,
              Mongoose models, pagination, filtering, and error handling.
            </p>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Generate Project Code
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex gap-4 min-h-0">
          {/* File tree */}
          <div className="w-56 shrink-0 border border-zinc-800 rounded-lg overflow-auto bg-zinc-900/50">
            <div className="px-3 py-2 border-b border-zinc-800 text-xs text-zinc-500 flex items-center gap-1.5">
              <FolderTree size={12} />
              {projectName} ({files.length} files)
            </div>
            <div className="p-1">
              {Object.entries(groupFiles(files)).map(([dir, dirFiles]) => (
                <div key={dir} className="mb-1">
                  {dir !== '.' && (
                    <div className="px-2 py-1 text-[10px] text-zinc-600 uppercase tracking-wide">
                      {dir}/
                    </div>
                  )}
                  {dirFiles.map((file) => (
                    <button
                      key={file.index}
                      onClick={() => setSelectedFile(file.index)}
                      className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors ${
                        selectedFile === file.index
                          ? 'bg-zinc-800 text-zinc-100'
                          : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300'
                      }`}
                    >
                      <span className="font-mono">
                        {file.path.includes('/') ? file.path.split('/').pop() : file.path}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Code view */}
          <div className="flex-1 min-w-0 overflow-auto">
            {selectedFile !== null && files[selectedFile] && (
              <CodePreview
                filename={files[selectedFile].path}
                code={files[selectedFile].content}
                language="javascript"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
