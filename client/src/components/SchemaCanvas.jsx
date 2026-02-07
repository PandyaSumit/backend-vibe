import { useState, useRef, useCallback, useEffect } from 'react';
import { Database, Key, Link2, Hash, Calendar, ToggleLeft, List, Box } from 'lucide-react';

const TYPE_ICONS = {
  String: Hash,
  Number: Hash,
  Boolean: ToggleLeft,
  Date: Calendar,
  ObjectId: Link2,
  Array: List,
  Mixed: Box,
};

const TYPE_COLORS = {
  String: 'text-green-400',
  Number: 'text-yellow-400',
  Boolean: 'text-purple-400',
  Date: 'text-orange-400',
  ObjectId: 'text-blue-400',
  Array: 'text-cyan-400',
  Mixed: 'text-zinc-400',
};

function EntityNode({ entity, position, onDragStart, selected, onClick }) {
  const fields = entity.fields || [];
  const nodeHeight = 52 + fields.length * 28 + 8;

  return (
    <g
      transform={`translate(${position.x}, ${position.y})`}
      onMouseDown={(e) => onDragStart(e, entity.name)}
      onClick={(e) => { e.stopPropagation(); onClick(entity.name); }}
      className="cursor-grab active:cursor-grabbing"
    >
      {/* Node background */}
      <rect
        width={280}
        height={nodeHeight}
        rx={8}
        fill={selected ? '#1e293b' : '#18181b'}
        stroke={selected ? '#3b82f6' : '#27272a'}
        strokeWidth={selected ? 2 : 1}
      />

      {/* Header */}
      <rect width={280} height={44} rx={8} fill={selected ? '#1e3a5f' : '#1f1f23'} />
      <rect y={36} width={280} height={8} fill={selected ? '#1e3a5f' : '#1f1f23'} />

      {/* Entity icon and name */}
      <g transform="translate(12, 14)">
        <rect width={18} height={18} rx={3} fill="#3b82f6" opacity={0.2} />
        <text x={9} y={13} textAnchor="middle" fill="#3b82f6" fontSize={10} fontFamily="sans-serif">
          E
        </text>
      </g>
      <text x={38} y={27} fill="#e4e4e7" fontSize={13} fontWeight={600} fontFamily="Inter, sans-serif">
        {entity.name}
      </text>

      {/* CRUD badge */}
      {entity.generateCrud && (
        <g transform={`translate(${Math.min(38 + entity.name.length * 8 + 8, 200)}, 16)`}>
          <rect width={38} height={18} rx={3} fill="#166534" opacity={0.4} />
          <text x={19} y={13} textAnchor="middle" fill="#4ade80" fontSize={9} fontWeight={600} fontFamily="sans-serif">
            CRUD
          </text>
        </g>
      )}

      {/* Fields */}
      {fields.map((field, i) => {
        const y = 52 + i * 28;
        const isRef = field.fieldType === 'ObjectId' && field.ref;
        return (
          <g key={field.name} transform={`translate(0, ${y})`}>
            {/* Field row hover area */}
            <rect x={4} width={272} height={26} rx={4} fill="transparent" className="hover:fill-zinc-800/30" />

            {/* Type indicator dot */}
            <circle
              cx={18}
              cy={13}
              r={3}
              fill={
                field.fieldType === 'String' ? '#4ade80' :
                field.fieldType === 'Number' ? '#facc15' :
                field.fieldType === 'Boolean' ? '#a78bfa' :
                field.fieldType === 'Date' ? '#fb923c' :
                field.fieldType === 'ObjectId' ? '#60a5fa' :
                field.fieldType === 'Array' ? '#22d3ee' : '#71717a'
              }
            />

            {/* Field name */}
            <text x={30} y={17} fill={isRef ? '#60a5fa' : '#a1a1aa'} fontSize={11} fontFamily="JetBrains Mono, monospace">
              {field.name}
            </text>

            {/* Type label */}
            <text
              x={268}
              y={17}
              textAnchor="end"
              fill="#52525b"
              fontSize={10}
              fontFamily="JetBrains Mono, monospace"
            >
              {field.fieldType}{isRef ? ` -> ${field.ref}` : ''}
            </text>

            {/* Required indicator */}
            {field.required && (
              <text x={266} y={17} textAnchor="end" fill="#ef4444" fontSize={10}>
                *
              </text>
            )}
          </g>
        );
      })}

      {/* Connection port (right side) */}
      <circle cx={280} cy={22} r={5} fill="#27272a" stroke="#3f3f46" strokeWidth={1} />
      {/* Connection port (left side) */}
      <circle cx={0} cy={22} r={5} fill="#27272a" stroke="#3f3f46" strokeWidth={1} />
    </g>
  );
}

function RelationshipEdge({ from, to, positions, label, type }) {
  const fromPos = positions[from];
  const toPos = positions[to];
  if (!fromPos || !toPos) return null;

  const fromX = fromPos.x + 280;
  const fromY = fromPos.y + 22;
  const toX = toPos.x;
  const toY = toPos.y + 22;

  // If target is to the left, connect differently
  let startX, startY, endX, endY;
  if (toPos.x > fromPos.x + 140) {
    startX = fromPos.x + 280;
    startY = fromPos.y + 22;
    endX = toPos.x;
    endY = toPos.y + 22;
  } else if (toPos.x < fromPos.x - 140) {
    startX = fromPos.x;
    startY = fromPos.y + 22;
    endX = toPos.x + 280;
    endY = toPos.y + 22;
  } else {
    // Vertical connection
    if (toPos.y > fromPos.y) {
      const fromHeight = 52 + ((positions[from]?.fieldCount || 4) * 28) + 8;
      startX = fromPos.x + 140;
      startY = fromPos.y + fromHeight;
      endX = toPos.x + 140;
      endY = toPos.y;
    } else {
      const toHeight = 52 + ((positions[to]?.fieldCount || 4) * 28) + 8;
      startX = fromPos.x + 140;
      startY = fromPos.y;
      endX = toPos.x + 140;
      endY = toPos.y + toHeight;
    }
  }

  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  // Bezier curve
  const cx1 = startX + (endX - startX) * 0.4;
  const cy1 = startY;
  const cx2 = endX - (endX - startX) * 0.4;
  const cy2 = endY;

  const cardinality = type === 'many-to-one' ? 'N:1' : type === 'one-to-many' ? '1:N' : 'N:N';

  return (
    <g>
      <path
        d={`M ${startX} ${startY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endX} ${endY}`}
        fill="none"
        stroke="#3f3f46"
        strokeWidth={1.5}
        strokeDasharray={type === 'many-to-many' ? '6 3' : 'none'}
      />
      {/* Arrow head */}
      <circle cx={endX} cy={endY} r={3} fill="#3f3f46" />

      {/* Label */}
      {label && (
        <g transform={`translate(${midX}, ${midY - 8})`}>
          <rect x={-30} y={-8} width={60} height={16} rx={4} fill="#18181b" stroke="#27272a" />
          <text x={0} y={4} textAnchor="middle" fill="#71717a" fontSize={9} fontFamily="sans-serif">
            {cardinality}
          </text>
        </g>
      )}
    </g>
  );
}

export default function SchemaCanvas({ entities, relationships, onEntitySelect, selectedEntity }) {
  const svgRef = useRef(null);
  const [positions, setPositions] = useState({});
  const [viewBox, setViewBox] = useState({ x: -40, y: -40, w: 1200, h: 800 });
  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Initialize positions from entity canvas data
  useEffect(() => {
    const pos = {};
    (entities || []).forEach((entity) => {
      pos[entity.name] = {
        x: entity.canvas?.x || 0,
        y: entity.canvas?.y || 0,
        fieldCount: (entity.fields || []).length,
      };
    });
    setPositions(pos);

    // Auto-fit viewbox
    if (entities && entities.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      entities.forEach((e) => {
        const x = e.canvas?.x || 0;
        const y = e.canvas?.y || 0;
        const h = 52 + (e.fields || []).length * 28 + 8;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + 280);
        maxY = Math.max(maxY, y + h);
      });
      setViewBox({
        x: minX - 60,
        y: minY - 60,
        w: Math.max(maxX - minX + 120, 800),
        h: Math.max(maxY - minY + 120, 500),
      });
    }
  }, [entities]);

  const handleDragStart = useCallback((e, entityName) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());

    setDragging(entityName);
    setDragOffset({
      x: svgP.x - (positions[entityName]?.x || 0),
      y: svgP.y - (positions[entityName]?.y || 0),
    });
  }, [positions]);

  const handleMouseMove = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return;

    if (dragging) {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());

      setPositions((prev) => ({
        ...prev,
        [dragging]: {
          ...prev[dragging],
          x: svgP.x - dragOffset.x,
          y: svgP.y - dragOffset.y,
        },
      }));
    } else if (panning) {
      const dx = (e.clientX - panStart.x) * (viewBox.w / svg.clientWidth);
      const dy = (e.clientY - panStart.y) * (viewBox.h / svg.clientHeight);
      setViewBox((prev) => ({
        ...prev,
        x: prev.x - dx,
        y: prev.y - dy,
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, [dragging, dragOffset, panning, panStart, viewBox]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setPanning(false);
  }, []);

  const handlePanStart = useCallback((e) => {
    if (e.target === svgRef.current || e.target.tagName === 'rect' && !e.target.closest('g[transform]')) {
      setPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const scale = e.deltaY > 0 ? 1.1 : 0.9;
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());

    setViewBox((prev) => {
      const newW = prev.w * scale;
      const newH = prev.h * scale;
      return {
        x: svgP.x - (svgP.x - prev.x) * scale,
        y: svgP.y - (svgP.y - prev.y) * scale,
        w: newW,
        h: newH,
      };
    });
  }, []);

  const isEmpty = !entities || entities.length === 0;

  return (
    <div className="relative w-full h-full bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden">
      {/* Grid background pattern */}
      <svg
        ref={svgRef}
        className="w-full h-full"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        onMouseDown={handlePanStart}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: panning ? 'grabbing' : dragging ? 'grabbing' : 'default' }}
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="0.5" cy="0.5" r="0.5" fill="#27272a" />
          </pattern>
        </defs>

        {/* Grid */}
        <rect
          x={viewBox.x - 1000}
          y={viewBox.y - 1000}
          width={viewBox.w + 2000}
          height={viewBox.h + 2000}
          fill="url(#grid)"
        />

        {/* Relationship edges (render behind nodes) */}
        {(relationships || []).map((rel, i) => (
          <RelationshipEdge
            key={`${rel.from}-${rel.to}-${i}`}
            from={rel.from}
            to={rel.to}
            positions={positions}
            label={rel.label}
            type={rel.type}
          />
        ))}

        {/* Entity nodes */}
        {(entities || []).map((entity) => (
          <EntityNode
            key={entity.name}
            entity={entity}
            position={positions[entity.name] || { x: 0, y: 0 }}
            onDragStart={handleDragStart}
            selected={selectedEntity === entity.name}
            onClick={onEntitySelect}
          />
        ))}
      </svg>

      {isEmpty && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <Database size={48} className="mx-auto text-zinc-800 mb-3" />
            <p className="text-sm text-zinc-600">Describe your backend to generate an architecture</p>
          </div>
        </div>
      )}

      {/* Zoom controls */}
      {!isEmpty && (
        <div className="absolute bottom-3 right-3 flex gap-1">
          <button
            onClick={() => setViewBox((v) => ({ ...v, w: v.w * 0.8, h: v.h * 0.8 }))}
            className="w-7 h-7 bg-zinc-800 border border-zinc-700 rounded text-zinc-400 hover:text-zinc-200 text-sm flex items-center justify-center"
          >
            +
          </button>
          <button
            onClick={() => setViewBox((v) => ({ ...v, w: v.w * 1.2, h: v.h * 1.2 }))}
            className="w-7 h-7 bg-zinc-800 border border-zinc-700 rounded text-zinc-400 hover:text-zinc-200 text-sm flex items-center justify-center"
          >
            -
          </button>
        </div>
      )}

      {/* Entity count */}
      {!isEmpty && (
        <div className="absolute top-3 left-3 px-2 py-1 bg-zinc-900/80 border border-zinc-800 rounded text-[10px] text-zinc-500">
          {entities.length} entities &middot; {(relationships || []).length} relationships
        </div>
      )}
    </div>
  );
}
