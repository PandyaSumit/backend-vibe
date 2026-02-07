import { useState } from 'react';
import { Sparkles, Loader2, Send, ChevronDown } from 'lucide-react';

const QUICK_PROMPTS = [
  'E-commerce with users, products, orders, reviews',
  'SaaS project management with workspaces, tasks, teams',
  'Social media with users, posts, comments, followers',
  'Blog platform with authors, articles, tags, comments',
  'Multi-tenant CRM with contacts, deals, activities',
];

export default function CommandBar({
  onGenerate,
  generating,
  placeholder = 'Describe your backend...',
  buttonLabel = 'Generate',
  compact = false,
}) {
  const [prompt, setPrompt] = useState('');
  const [showExamples, setShowExamples] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!prompt.trim() || generating) return;
    onGenerate(prompt.trim());
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <Sparkles size={14} className="text-indigo-400" />
          </div>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholder}
            className={`w-full pl-9 pr-4 bg-zinc-800/80 border border-zinc-700/50 rounded-lg text-zinc-100 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none placeholder:text-zinc-600 transition-all ${
              compact ? 'py-1.5 text-xs' : 'py-2 text-sm'
            }`}
          />
        </div>
        <button
          type="submit"
          disabled={generating || !prompt.trim()}
          className={`flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${
            compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
          }`}
        >
          {generating ? (
            <Loader2 size={compact ? 12 : 14} className="animate-spin" />
          ) : (
            <Send size={compact ? 12 : 14} />
          )}
          {generating ? 'Generating...' : buttonLabel}
        </button>
      </form>

      {!compact && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <button
            onClick={() => setShowExamples(!showExamples)}
            className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Examples
            <ChevronDown size={8} className={`transition-transform ${showExamples ? 'rotate-180' : ''}`} />
          </button>
          {showExamples && (
            <div className="flex flex-wrap gap-1">
              {QUICK_PROMPTS.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setPrompt(ex)}
                  className="px-2 py-0.5 text-[10px] text-zinc-600 hover:text-zinc-400 bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 rounded transition-colors truncate max-w-[240px]"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
