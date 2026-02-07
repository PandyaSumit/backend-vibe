export default function CodePreview({ code, filename, language }) {
  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      {filename && (
        <div className="px-4 py-2 bg-zinc-800/50 border-b border-zinc-800 flex items-center justify-between">
          <span className="text-xs font-mono text-zinc-400">{filename}</span>
          <button
            onClick={() => navigator.clipboard.writeText(code)}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 px-2 py-0.5 rounded hover:bg-zinc-700 transition-colors"
          >
            Copy
          </button>
        </div>
      )}
      <pre className="p-4 bg-zinc-950 overflow-x-auto text-xs leading-relaxed">
        <code className="text-zinc-300 font-mono">{code}</code>
      </pre>
    </div>
  );
}
