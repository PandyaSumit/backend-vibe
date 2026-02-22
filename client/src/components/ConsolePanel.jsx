import { useState } from 'react';
import {
  Terminal,
  X,
  Trash2,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Info,
  ArrowUpRight,
} from 'lucide-react';

const METHOD_COLORS = {
  GET: 'text-green-400',
  POST: 'text-blue-400',
  PUT: 'text-yellow-400',
  PATCH: 'text-yellow-400',
  DELETE: 'text-red-400',
};

function statusClass(status) {
  if (!status) return 'text-zinc-400';
  if (status >= 200 && status < 300) return 'text-green-400';
  if (status >= 300 && status < 400) return 'text-blue-400';
  if (status >= 400 && status < 500) return 'text-yellow-400';
  return 'text-red-400';
}

function LogEntry({ log }) {
  const time = new Date(log.timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  if (log.type === 'request') {
    return (
      <div className="flex items-center gap-2 px-3 py-1 hover:bg-zinc-800/30 text-xs font-mono">
        <span className="text-zinc-600 w-16 shrink-0">{time}</span>
        <ArrowUpRight size={10} className="text-zinc-600 shrink-0" />
        <span className={`font-bold w-12 shrink-0 ${METHOD_COLORS[log.method] || 'text-zinc-400'}`}>
          {log.method}
        </span>
        <span className="text-zinc-300 truncate flex-1">{log.path}</span>
        <span className={`w-8 text-right shrink-0 ${statusClass(log.status)}`}>{log.status}</span>
        <span className="text-zinc-600 w-16 text-right shrink-0">{log.duration}</span>
        {log.size > 0 && (
          <span className="text-zinc-700 w-14 text-right shrink-0">
            {log.size > 1024 ? `${(log.size / 1024).toFixed(1)}KB` : `${log.size}B`}
          </span>
        )}
      </div>
    );
  }

  const iconMap = {
    info: <Info size={10} className="text-blue-400 shrink-0" />,
    error: <AlertCircle size={10} className="text-red-400 shrink-0" />,
    success: <CheckCircle2 size={10} className="text-green-400 shrink-0" />,
  };

  const textColor = {
    info: 'text-zinc-400',
    error: 'text-red-300',
    success: 'text-green-300',
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1 hover:bg-zinc-800/30 text-xs font-mono">
      <span className="text-zinc-600 w-16 shrink-0">{time}</span>
      {iconMap[log.type] || iconMap.info}
      <span className={textColor[log.type] || 'text-zinc-400'}>{log.message}</span>
    </div>
  );
}

export default function ConsolePanel({ logs, isOpen, onToggle, onClear }) {
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 border-t border-zinc-800 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors w-full"
      >
        <Terminal size={10} />
        Console
        {logs.length > 0 && (
          <span className="px-1.5 py-0.5 bg-zinc-800 rounded text-[9px]">{logs.length}</span>
        )}
        <ChevronUp size={10} className="ml-auto" />
      </button>
    );
  }

  return (
    <div className="flex flex-col border-t border-zinc-800 bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Terminal size={12} className="text-zinc-500" />
          <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wide">Console</span>
          <span className="text-[10px] text-zinc-600">{logs.length} entries</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onClear}
            className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors"
            title="Clear logs"
          >
            <Trash2 size={11} />
          </button>
          <button
            onClick={onToggle}
            className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <ChevronDown size={11} />
          </button>
        </div>
      </div>

      {/* Log entries */}
      <div className="h-36 overflow-auto">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[10px] text-zinc-700">
            No activity yet. Run an API request to see logs here.
          </div>
        ) : (
          logs.map((log) => <LogEntry key={log.id} log={log} />)
        )}
      </div>
    </div>
  );
}
