import { useState, useEffect, useRef, useCallback } from 'react'
import { GitFork, Filter, Search, Info, X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { DEMO_GRAPH_NODES, DEMO_GRAPH_EDGES } from '@/lib/demo-data'
import { getKnowledgeNodes, getKnowledgeEdges, getNeighbors } from '@/lib/supabase'
import type { KnowledgeNode, KnowledgeEdge } from '@/types'

const NODE_COLORS: Record<string, string> = {
  equipment:   '#3b82f6',
  procedure:   '#8b5cf6',
  incident:    '#ef4444',
  regulation:  '#f59e0b',
  chemical:    '#10b981',
  person:      '#06b6d4',
  location:    '#6b7280',
  document:    '#64748b',
}

const NODE_SIZES: Record<string, number> = {
  equipment:  14,
  procedure:  10,
  incident:   12,
  regulation: 10,
  chemical:   9,
  person:     8,
  location:   9,
  document:   8,
}

// Simple force-directed layout positions for demo
const DEMO_POSITIONS: Record<string, { x: number; y: number }> = {
  'eq:p101':       { x: 220, y: 240 },
  'eq:v302':       { x: 430, y: 140 },
  'eq:ct01':       { x: 620, y: 290 },
  'eq:gd304':      { x: 310, y: 390 },
  'eq:v102':       { x: 530, y: 420 },
  'reg:oisd118':   { x: 140, y: 390 },
  'reg:oisd137':   { x: 500, y: 260 },
  'reg:factory36': { x: 660, y: 440 },
  'proc:sop047':   { x: 110, y: 190 },
  'chem:h2s':      { x: 360, y: 490 },
  'chem:naphtha':  { x: 80,  y: 310 },
  'inc:iir014':    { x: 250, y: 500 },
  'loc:cokeoven':  { x: 420, y: 470 },
  'loc:fpu':       { x: 160, y: 300 },
}

export default function KnowledgeGraphPage() {
  const svgRef = useRef<SVGSVGElement>(null)
  const [nodes, setNodes] = useState<KnowledgeNode[]>(DEMO_GRAPH_NODES as KnowledgeNode[])
  const [edges, setEdges] = useState<KnowledgeEdge[]>(DEMO_GRAPH_EDGES as KnowledgeEdge[])
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null)
  const [filterType, setFilterType] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  useEffect(() => {
    if (import.meta.env.VITE_DEMO_MODE !== 'true') {
      Promise.all([getKnowledgeNodes(), getKnowledgeEdges()])
        .then(([n, e]) => { setNodes(n); setEdges(e) })
        .catch(console.error)
    }
  }, [])

  const nodeTypes = [...new Set(nodes.map(n => n.node_type))]

  const visibleNodes = nodes.filter(n => {
    if (filterType && n.node_type !== filterType) return false
    if (search && !n.label.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const visibleNodeIds = new Set(visibleNodes.map(n => n.id))
  const visibleEdges = edges.filter(
    e => visibleNodeIds.has(e.source_id) && visibleNodeIds.has(e.target_id)
  )

  const getPos = (nodeId: string) =>
    DEMO_POSITIONS[nodeId] ?? { x: 400 + Math.random() * 200 - 100, y: 300 + Math.random() * 200 - 100 }

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as Element).closest('.graph-node')) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
  }
  const handleMouseUp = () => setIsDragging(false)

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    setZoom(z => Math.max(0.4, Math.min(3, z - e.deltaY * 0.001)))
  }

  const connectedEdges = selectedNode
    ? visibleEdges.filter(e => e.source_id === selectedNode.id || e.target_id === selectedNode.id)
    : []
  const connectedIds = new Set(connectedEdges.flatMap(e => [e.source_id, e.target_id]))

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex-shrink-0 h-14 flex items-center justify-between px-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <GitFork size={16} className="text-signal-green" />
          <span className="text-sm font-medium text-carbon-200">Knowledge Graph</span>
          <span className="text-xs text-carbon-600 font-mono">
            {visibleNodes.length} nodes · {visibleEdges.length} edges
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-carbon-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search nodes…"
              className="query-input text-xs py-1.5 pl-7 w-36"
            />
          </div>
          <div className="flex gap-1 p-1 bg-carbon-900 rounded-lg border border-white/5">
            {nodeTypes.map(t => (
              <button
                key={t}
                onClick={() => setFilterType(filterType === t ? null : t)}
                className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded transition-all"
                style={filterType === t
                  ? { background: NODE_COLORS[t] + '22', color: NODE_COLORS[t], border: `1px solid ${NODE_COLORS[t]}44` }
                  : { color: '#666', border: '1px solid transparent' }
                }
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: NODE_COLORS[t] }} />
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 border border-white/5 rounded-lg overflow-hidden">
            <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="p-1.5 hover:bg-white/5 text-carbon-400 hover:text-carbon-200"><ZoomIn size={12} /></button>
            <span className="text-[10px] font-mono text-carbon-600 px-1">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.max(0.4, z - 0.2))} className="p-1.5 hover:bg-white/5 text-carbon-400 hover:text-carbon-200"><ZoomOut size={12} /></button>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }} className="p-1.5 hover:bg-white/5 text-carbon-400 hover:text-carbon-200"><Maximize2 size={12} /></button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Graph Canvas */}
        <div className="flex-1 relative overflow-hidden bg-carbon-950" style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>
          <svg
            ref={svgRef}
            className="w-full h-full"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <defs>
              <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M2 1L8 5L2 9" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeLinecap="round" />
              </marker>
            </defs>
            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              {/* Edges */}
              {visibleEdges.map(edge => {
                const s = getPos(edge.source_id)
                const t = getPos(edge.target_id)
                const isHighlighted = connectedIds.has(edge.source_id) && connectedIds.has(edge.target_id) && selectedNode !== null
                const mx = (s.x + t.x) / 2
                const my = (s.y + t.y) / 2
                return (
                  <g key={edge.id}>
                    <line
                      x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                      stroke={isHighlighted ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.06)'}
                      strokeWidth={isHighlighted ? 1.5 : 0.8}
                      markerEnd="url(#arr)"
                    />
                    {isHighlighted && (
                      <text x={mx} y={my} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.4)" fontFamily="monospace" dy="-3">
                        {edge.relationship}
                      </text>
                    )}
                  </g>
                )
              })}

              {/* Nodes */}
              {visibleNodes.map(node => {
                const pos = getPos(node.id)
                const color = NODE_COLORS[node.node_type] ?? '#888'
                const r = NODE_SIZES[node.node_type] ?? 10
                const isCritical = node.risk_level === 'critical'
                const isSelected = selectedNode?.id === node.id
                const isConnected = connectedIds.has(node.id)
                const isSearchMatch = search && node.label.toLowerCase().includes(search.toLowerCase())
                const dimmed = (selectedNode || search) && !isSelected && !isConnected && !isSearchMatch

                return (
                  <g
                    key={node.id}
                    className="graph-node"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedNode(isSelected ? null : node)}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    opacity={dimmed ? 0.2 : 1}
                  >
                    {/* Risk ring */}
                    {isCritical && (
                      <circle cx={pos.x} cy={pos.y} r={r + 5} fill="none" stroke="#ef4444" strokeWidth="1" opacity="0.4" strokeDasharray="3 2" />
                    )}
                    {/* Selection ring */}
                    {isSelected && (
                      <circle cx={pos.x} cy={pos.y} r={r + 4} fill="none" stroke={color} strokeWidth="2" opacity="0.6" />
                    )}
                    {/* Node */}
                    <circle
                      cx={pos.x} cy={pos.y} r={r}
                      fill={color}
                      fillOpacity={isSelected || hoveredNode === node.id ? 1 : 0.75}
                      stroke={color}
                      strokeWidth="1.5"
                    />
                    {/* Label */}
                    <text
                      x={pos.x} y={pos.y + r + 11}
                      textAnchor="middle"
                      fontSize="10"
                      fill="rgba(255,255,255,0.75)"
                      fontFamily="'JetBrains Mono', monospace"
                      fontWeight={isSelected ? '600' : '400'}
                    >
                      {node.label}
                    </text>
                  </g>
                )
              })}
            </g>
          </svg>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 panel p-3 pointer-events-none">
            <p className="text-[9px] text-carbon-600 mb-2 font-mono uppercase tracking-widest">Legend</p>
            {Object.entries(NODE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5 mb-0.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-[9px] text-carbon-500 capitalize">{type}</span>
              </div>
            ))}
            <div className="mt-2 pt-2 border-t border-white/5">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full border border-red-400 border-dashed flex-shrink-0" />
                <span className="text-[9px] text-carbon-500">Critical risk</span>
              </div>
            </div>
          </div>

          {/* Stats overlay */}
          <div className="absolute top-4 left-4 panel px-3 py-2 pointer-events-none">
            <div className="flex items-center gap-4 text-[10px] font-mono">
              <span className="text-carbon-500">{visibleNodes.length} nodes</span>
              <span className="text-carbon-500">{visibleEdges.length} edges</span>
              {filterType && <span style={{ color: NODE_COLORS[filterType] }}>Filter: {filterType}</span>}
            </div>
          </div>
        </div>

        {/* Detail Panel */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 border-l border-white/5 overflow-hidden"
            >
              <div className="w-[280px] h-full overflow-y-auto p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div
                      className="text-[10px] font-mono font-medium mb-1 capitalize"
                      style={{ color: NODE_COLORS[selectedNode.node_type] }}
                    >
                      {selectedNode.node_type}
                    </div>
                    <h3 className="text-sm font-semibold text-carbon-100">{selectedNode.label}</h3>
                  </div>
                  <button onClick={() => setSelectedNode(null)} className="text-carbon-600 hover:text-carbon-400">
                    <X size={14} />
                  </button>
                </div>

                {selectedNode.risk_level && (
                  <div className={`mb-4 px-2.5 py-1.5 rounded border text-xs font-medium
                    ${selectedNode.risk_level === 'critical' ? 'text-red-400 border-red-500/20 bg-red-500/5' :
                      selectedNode.risk_level === 'high' ? 'text-amber-400 border-amber-500/20 bg-amber-500/5' :
                      'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'}`}
                  >
                    ⚠ Risk: {selectedNode.risk_level.toUpperCase()}
                  </div>
                )}

                {/* Properties */}
                {Object.keys(selectedNode.properties ?? {}).length > 0 && (
                  <div className="mb-4">
                    <p className="section-label mb-2">Properties</p>
                    <div className="space-y-1.5">
                      {Object.entries(selectedNode.properties ?? {}).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-xs">
                          <span className="text-carbon-500 capitalize">{k.replace(/_/g, ' ')}</span>
                          <span className="text-carbon-300 font-mono text-right ml-2">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Connected nodes */}
                <div>
                  <p className="section-label mb-2">Connections ({connectedEdges.length})</p>
                  <div className="space-y-1.5">
                    {connectedEdges.map(edge => {
                      const otherId = edge.source_id === selectedNode.id ? edge.target_id : edge.source_id
                      const otherNode = nodes.find(n => n.id === otherId)
                      if (!otherNode) return null
                      const isOutgoing = edge.source_id === selectedNode.id
                      return (
                        <button
                          key={edge.id}
                          onClick={() => setSelectedNode(otherNode)}
                          className="w-full flex items-center gap-2 p-2 rounded hover:bg-white/5 transition-colors text-left"
                        >
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: NODE_COLORS[otherNode.node_type] }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-carbon-300 truncate">{otherNode.label}</p>
                            <p className="text-[9px] text-carbon-600 font-mono">
                              {isOutgoing ? '→' : '←'} {edge.relationship}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Source docs */}
                {(selectedNode.document_ids?.length ?? 0) > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <p className="section-label mb-2">Source Documents</p>
                    <p className="text-xs text-carbon-500 font-mono">
                      {selectedNode.document_ids?.length} document{selectedNode.document_ids?.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
