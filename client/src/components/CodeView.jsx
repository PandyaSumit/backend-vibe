import { useState, useEffect } from 'react';
import {
  FileCode,
  FolderOpen,
  ChevronRight,
  Copy,
  Download,
  Loader2,
  RefreshCw,
  Check,
} from 'lucide-react';
import { generate as generateApi } from '../services/api';

function FileTreeItem({ file, isActive, onClick, depth = 0 }) {
  const fileName = file.path.split('/').pop();
  const isDir = file.isDir;
  const ext = fileName.split('.').pop();

  const extColors = {
    js: 'text-yellow-400',
    json: 'text-green-400',
    env: 'text-orange-400',
    example: 'text-orange-400',
  };

  return (
    <button
      onClick={() => !isDir && onClick(file)}
      className={`w-full flex items-center gap-1.5 py-1 text-xs rounded transition-colors ${
        isActive
          ? 'bg-zinc-800 text-zinc-100'
          : isDir
            ? 'text-zinc-500'
            : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
      }`}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      {isDir ? (
        <FolderOpen size={12} className="text-blue-400/60 shrink-0" />
      ) : (
        <FileCode size={12} className={`shrink-0 ${extColors[ext] || 'text-zinc-500'}`} />
      )}
      <span className="truncate">{fileName}</span>
    </button>
  );
}

export default function CodeView({ projectId }) {
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const result = await generateApi.project(projectId);
      const fileList = (result.files || []).sort((a, b) => a.path.localeCompare(b.path));
      setFiles(fileList);
      setGenerated(true);
      if (fileList.length > 0) {
        setActiveFile(fileList[0]);
      }
    } catch (err) {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }

  // Build directory tree structure
  function buildTree() {
    const dirs = new Map();
    files.forEach((file) => {
      const parts = file.path.split('/');
      if (parts.length > 1) {
        dirs.set(parts[0], true);
      }
    });

    const tree = [];
    const grouped = {};

    files.forEach((file) => {
      const parts = file.path.split('/');
      if (parts.length > 1) {
        const dir = parts[0];
        if (!grouped[dir]) grouped[dir] = [];
        grouped[dir].push(file);
      } else {
        tree.push({ file, depth: 0 });
      }
    });

    const result = [];
    // Root files first
    files.filter((f) => !f.path.includes('/')).forEach((f) => result.push({ file: f, depth: 0 }));
    // Then directories
    Object.entries(grouped).forEach(([dir, dirFiles]) => {
      result.push({ file: { path: dir, isDir: true }, depth: 0 });
      dirFiles.forEach((f) => result.push({ file: f, depth: 1 }));
    });

    return result;
  }

  function handleCopy() {
    if (!activeFile) return;
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const treeItems = generated ? buildTree() : [];

  return (
    <div className="h-full flex">
      {/* File tree sidebar */}
      <div className="w-52 shrink-0 border-r border-zinc-800 bg-zinc-900/50 flex flex-col">
        <div className="p-2 border-b border-zinc-800">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wide font-medium">Files</span>
            {generated && (
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors"
                title="Regenerate"
              >
                <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-auto p-1">
          {!generated ? (
            <div className="p-4 text-center">
              <FileCode size={24} className="mx-auto text-zinc-800 mb-2" />
              <p className="text-[10px] text-zinc-600 mb-3">Generate production code from your schemas</p>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="flex items-center gap-1.5 mx-auto px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <FileCode size={12} />
                )}
                Generate Code
              </button>
            </div>
          ) : (
            treeItems.map(({ file, depth }) => (
              <FileTreeItem
                key={file.path}
                file={file}
                depth={depth}
                isActive={activeFile?.path === file.path}
                onClick={setActiveFile}
              />
            ))
          )}
        </div>
        {generated && (
          <div className="p-2 border-t border-zinc-800">
            <a
              href={generateApi.downloadUrl(projectId)}
              className="flex items-center justify-center gap-1.5 w-full px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg transition-colors"
            >
              <Download size={12} />
              Download ZIP
            </a>
          </div>
        )}
      </div>

      {/* Code editor area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeFile ? (
          <>
            {/* File tab */}
            <div className="shrink-0 flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <FileCode size={12} className="text-zinc-500" />
                <span className="text-xs text-zinc-300 font-mono">{activeFile.path}</span>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            {/* Code content */}
            <div className="flex-1 overflow-auto bg-zinc-950/50">
              <pre className="p-4 text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {activeFile.content}
              </pre>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileCode size={32} className="mx-auto text-zinc-800 mb-2" />
              <p className="text-xs text-zinc-600">
                {generated ? 'Select a file to view its code' : 'Generate code to get started'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
