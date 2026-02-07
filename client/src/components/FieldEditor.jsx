import { Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

const FIELD_TYPES = ['String', 'Number', 'Boolean', 'Date', 'ObjectId', 'Array', 'Mixed'];
const ARRAY_TYPES = ['String', 'Number', 'Boolean', 'Date', 'ObjectId', 'Mixed'];

export default function FieldEditor({ field, index, allSchemas, onChange, onRemove }) {
  const [expanded, setExpanded] = useState(false);

  function update(key, value) {
    onChange(index, { ...field, [key]: value });
  }

  return (
    <div className="border border-zinc-800 rounded-lg bg-zinc-900/50 overflow-hidden">
      {/* Compact row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <GripVertical size={14} className="text-zinc-700 shrink-0 cursor-grab" />

        <input
          type="text"
          value={field.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="fieldName"
          className="w-36 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 font-mono focus:border-blue-500 focus:outline-none"
        />

        <select
          value={field.fieldType}
          onChange={(e) => update('fieldType', e.target.value)}
          className="w-28 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
        >
          {FIELD_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
          <input
            type="checkbox"
            checked={field.required || false}
            onChange={(e) => update('required', e.target.checked)}
            className="rounded border-zinc-600 bg-zinc-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
          />
          required
        </label>

        <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
          <input
            type="checkbox"
            checked={field.unique || false}
            onChange={(e) => update('unique', e.target.checked)}
            className="rounded border-zinc-600 bg-zinc-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
          />
          unique
        </label>

        <div className="flex-1" />

        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
          title="More options"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        <button
          onClick={() => onRemove(index)}
          className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Expanded options */}
      {expanded && (
        <div className="px-3 py-3 border-t border-zinc-800 grid grid-cols-3 gap-3">
          {field.fieldType === 'ObjectId' && (
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-wide">
                Reference
              </label>
              <select
                value={field.ref || ''}
                onChange={(e) => update('ref', e.target.value)}
                className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
              >
                <option value="">None</option>
                {allSchemas.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {field.fieldType === 'Array' && (
            <>
              <div>
                <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-wide">
                  Array Item Type
                </label>
                <select
                  value={field.arrayType || 'String'}
                  onChange={(e) => update('arrayType', e.target.value)}
                  className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
                >
                  {ARRAY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              {field.arrayType === 'ObjectId' && (
                <div>
                  <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-wide">
                    Array Ref
                  </label>
                  <select
                    value={field.ref || ''}
                    onChange={(e) => update('ref', e.target.value)}
                    className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">None</option>
                    {allSchemas.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-wide">
              Default Value
            </label>
            <input
              type="text"
              value={field.default || ''}
              onChange={(e) => update('default', e.target.value)}
              placeholder={field.fieldType === 'Date' ? 'now' : ''}
              className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {field.fieldType === 'String' && (
            <>
              <div>
                <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-wide">
                  Enum Values (comma separated)
                </label>
                <input
                  type="text"
                  value={(field.enumValues || []).join(', ')}
                  onChange={(e) =>
                    update(
                      'enumValues',
                      e.target.value
                        .split(',')
                        .map((v) => v.trim())
                        .filter(Boolean)
                    )
                  }
                  placeholder="active, inactive, pending"
                  className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-wide">
                  Min Length
                </label>
                <input
                  type="number"
                  value={field.minLength || ''}
                  onChange={(e) => update('minLength', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-wide">
                  Max Length
                </label>
                <input
                  type="number"
                  value={field.maxLength || ''}
                  onChange={(e) => update('maxLength', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </>
          )}

          {field.fieldType === 'Number' && (
            <>
              <div>
                <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-wide">
                  Min
                </label>
                <input
                  type="number"
                  value={field.min ?? ''}
                  onChange={(e) => update('min', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-wide">
                  Max
                </label>
                <input
                  type="number"
                  value={field.max ?? ''}
                  onChange={(e) => update('max', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </>
          )}

          <div className="col-span-3">
            <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-wide">
              Description
            </label>
            <input
              type="text"
              value={field.description || ''}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Optional field description"
              className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
