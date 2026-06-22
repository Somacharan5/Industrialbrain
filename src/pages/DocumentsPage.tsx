import { useState, useEffect } from 'react'
import { FileText, Search, Filter, Download, GitFork, Clock, CheckCircle, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { getDocuments } from '@/lib/supabase'
import type { Document, DocType } from '@/types'
import { useNavigate } from 'react-router-dom'

const DEMO_DOCS: Document[] = [
  { id: 'd1', title: 'Feed Pump P-101 Isolation Procedure', doc_type: 'procedure', file_path: 'SOP-MAINT-047.pdf', file_size: 284000, mime_type: 'application/pdf', plant_area: 'FPU', equipment_tags: ['P-101'], regulatory_refs: ['OISD-137'], chunk_count: 12, ingested_at: '2026-03-01T10:00:00Z', updated_at: '2026-03-01T10:00:00Z', status: 'ready', metadata: {} },
  { id: 'd2', title: 'OISD-118 Third Revision 2019 — Gas Detection', doc_type: 'regulatory', file_path: 'OISD-118-Rev3.pdf', file_size: 1240000, mime_type: 'application/pdf', plant_area: undefined, equipment_tags: ['GD-301', 'GD-304', 'GD-308'], regulatory_refs: ['OISD-118'], chunk_count: 47, ingested_at: '2026-01-15T09:00:00Z', updated_at: '2026-01-15T09:00:00Z', status: 'ready', metadata: {} },
  { id: 'd3', title: 'V-302 Compressor Vibration Investigation', doc_type: 'maintenance', file_path: 'WO-2026-1847.docx', file_size: 98000, mime_type: 'application/docx', plant_area: 'Compression', equipment_tags: ['V-302'], regulatory_refs: [], chunk_count: 8, ingested_at: '2026-04-16T14:00:00Z', updated_at: '2026-04-16T14:00:00Z', status: 'ready', metadata: {} },
  { id: 'd4', title: 'Near-Miss Investigation — Coke Oven Battery #2', doc_type: 'incident', file_path: 'IIR-2025-014.pdf', file_size: 156000, mime_type: 'application/pdf', plant_area: 'Coke Oven', equipment_tags: ['GD-304'], regulatory_refs: ['OISD-118'], chunk_count: 14, ingested_at: '2025-10-02T11:00:00Z', updated_at: '2025-10-02T11:00:00Z', status: 'ready', metadata: {} },
  { id: 'd5', title: 'Feed Pump P-101 Equipment Data Sheet', doc_type: 'other', file_path: 'EDS-FPU-P101.pdf', file_size: 312000, mime_type: 'application/pdf', plant_area: 'FPU', equipment_tags: ['P-101'], regulatory_refs: ['OISD-137'], chunk_count: 6, ingested_at: '2026-02-10T08:00:00Z', updated_at: '2026-02-10T08:00:00Z', status: 'ready', metadata: {} },
  { id: 'd6', title: 'Factory Act 1948 — Pressure Vessel Sections', doc_type: 'regulatory', file_path: 'FactoryAct-PressureVessel.pdf', file_size: 890000, mime_type: 'application/pdf', plant_area: undefined, equipment_tags: ['V-102'], regulatory_refs: ['Factory Act S.36'], chunk_count: 31, ingested_at: '2026-01-08T09:00:00Z', updated_at: '2026-01-08T09:00:00Z', status: 'ready', metadata: {} },
  { id: 'd7', title: 'H2S PPE Requirements — Hazardous Areas', doc_type: 'procedure', file_path: 'SAFETY-PPE-002.pdf', file_size: 124000, mime_type: 'application/pdf', plant_area: 'Coke Oven', equipment_tags: [], regulatory_refs: ['OISD-118'], chunk_count: 9, ingested_at: '2026-02-28T10:00:00Z', updated_at: '2026-02-28T10:00:00Z', status: 'ready', metadata: {} },
  { id: 'd8', title: 'CT-01 Fan Motors PdM Records — 2025-2026', doc_type: 'maintenance', file_path: 'PM-CT01-2026.xlsx', file_size: 67000, mime_type: 'application/xlsx', plant_area: 'Utilities', equipment_tags: ['CT-01'], regulatory_refs: ['OISD-137'], chunk_count: 5, ingested_at: '2026-06-10T15:00:00Z', updated_at: '2026-06-10T15:00:00Z', status: 'ready', metadata: {} },
]

const DOC_TYPE_LABELS: Record<DocType, string> = {
  pid: 'P&ID', procedure: 'Procedure', maintenance: 'Maintenance',
  inspection: 'Inspection', incident: 'Incident', regulatory: 'Regulatory',
  oem_manual: 'OEM Manual', qa_record: 'QA Record', project_doc: 'Project', email_archive: 'Email', other: 'Other',
}

const DOC_TYPE_COLORS: Record<string, string> = {
  procedure: 'badge-blue', regulatory: 'badge-amber', maintenance: 'badge-green',
  incident: 'badge-red', inspection: 'badge-blue', oem_manual: 'badge-blue', other: '',
}

export default function DocumentsPage() {
  const navigate = useNavigate()
  const [docs, setDocs] = useState<Document[]>(DEMO_DOCS)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (import.meta.env.VITE_DEMO_MODE !== 'true') {
      setLoading(true)
      getDocuments().then(setDocs).catch(console.error).finally(() => setLoading(false))
    }
  }, [])

  const filtered = docs.filter(d => {
    if (filterType !== 'all' && d.doc_type !== filterType) return false
    if (search && !d.title.toLowerCase().includes(search.toLowerCase()) &&
        !d.equipment_tags.some(t => t.toLowerCase().includes(search.toLowerCase()))) return false
    return true
  })

  const types = [...new Set(docs.map(d => d.doc_type))]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="section-label mb-1">Knowledge Base</div>
        <h1 className="text-2xl font-semibold text-carbon-100">Document Library</h1>
        <p className="text-sm text-carbon-500 mt-0.5">
          {docs.filter(d => d.status === 'ready').length} documents ingested · {docs.reduce((s, d) => s + d.chunk_count, 0).toLocaleString()} searchable chunks
        </p>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-carbon-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title or equipment tag…" className="query-input pl-9" />
        </div>
        <div className="flex gap-1 p-1 bg-carbon-900 rounded-lg border border-white/5 overflow-x-auto">
          <button onClick={() => setFilterType('all')} className={`text-xs px-2.5 py-1 rounded transition-all ${filterType === 'all' ? 'bg-white/10 text-carbon-200' : 'text-carbon-500 hover:text-carbon-300'}`}>All</button>
          {types.map(t => (
            <button key={t} onClick={() => setFilterType(filterType === t ? 'all' : t)} className={`text-xs px-2.5 py-1 rounded transition-all ${filterType === t ? 'bg-white/10 text-carbon-200' : 'text-carbon-500 hover:text-carbon-300'}`}>
              {DOC_TYPE_LABELS[t as DocType]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="panel overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-[1fr_120px_120px_80px_100px] gap-3 px-4 py-2.5 border-b border-white/5 text-[10px] font-mono text-carbon-600 uppercase tracking-widest">
            <span>Document</span>
            <span>Type</span>
            <span>Equipment</span>
            <span>Chunks</span>
            <span>Ingested</span>
          </div>
          {loading && (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[1fr_120px_120px_80px_100px] gap-3 px-4 py-3 border-b border-white/3 last:border-0 items-center animate-pulse">
                <div className="h-3.5 w-3/4 bg-white/5 rounded" />
                <div className="h-3 w-12 bg-white/5 rounded" />
                <div className="h-3 w-16 bg-white/5 rounded" />
                <div className="h-3 w-6 bg-white/5 rounded" />
                <div className="h-3 w-10 bg-white/5 rounded" />
              </div>
            ))
          )}
          {!loading && filtered.map((doc, i) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="grid grid-cols-[1fr_120px_120px_80px_100px] gap-3 px-4 py-3 border-b border-white/3 last:border-0 hover:bg-white/3 cursor-pointer transition-colors items-center"
              onClick={() => setSelectedDoc(doc === selectedDoc ? null : doc)}
            >
              <div className="min-w-0">
                <p className="text-sm text-carbon-200 truncate">{doc.title}</p>
                {doc.plant_area && <p className="text-[10px] text-carbon-600 font-mono">{doc.plant_area}</p>}
              </div>
              <div>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${DOC_TYPE_COLORS[doc.doc_type] || 'text-carbon-500 bg-carbon-800'}`}>
                  {DOC_TYPE_LABELS[doc.doc_type as DocType]}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {doc.equipment_tags.slice(0, 2).map(t => (
                  <span key={t} className="text-[9px] font-mono text-blue-400 bg-blue-500/10 px-1 rounded">{t}</span>
                ))}
                {doc.equipment_tags.length > 2 && <span className="text-[9px] text-carbon-600">+{doc.equipment_tags.length - 2}</span>}
              </div>
              <span className="text-xs font-mono text-carbon-500">{doc.chunk_count}</span>
              <span className="text-[10px] font-mono text-carbon-600">
                {new Date(doc.ingested_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              </span>
            </motion.div>
          ))}
          {!loading && filtered.length === 0 && (
            <div className="py-12 text-center text-carbon-600 text-sm">No documents match your search</div>
          )}
        </div>
      </div>
      <p className="text-[10px] text-carbon-600 mt-1.5 sm:hidden">Scroll sideways to see all columns →</p>

      {/* Selected doc detail */}
      {selectedDoc && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-4 panel p-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-medium text-carbon-100">{selectedDoc.title}</h3>
              <p className="text-xs text-carbon-500 font-mono mt-0.5">{selectedDoc.file_path} · {(selectedDoc.file_size / 1024).toFixed(0)} KB</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => navigate(`/query?q=Tell me about ${selectedDoc.title}`)} className="btn-primary text-xs">
                <FileText size={11} /> Ask about this doc
              </button>
              <button onClick={() => navigate('/graph')} className="btn-secondary text-xs">
                <GitFork size={11} /> View in graph
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <p className="section-label mb-1">Regulatory Refs</p>
              {selectedDoc.regulatory_refs.length ? selectedDoc.regulatory_refs.map(r => (
                <span key={r} className="badge-amber mr-1 mb-1 inline-block">{r}</span>
              )) : <span className="text-carbon-600">None</span>}
            </div>
            <div>
              <p className="section-label mb-1">Equipment Tags</p>
              {selectedDoc.equipment_tags.length ? selectedDoc.equipment_tags.map(t => (
                <span key={t} className="badge-blue mr-1 mb-1 inline-block">{t}</span>
              )) : <span className="text-carbon-600">None</span>}
            </div>
            <div>
              <p className="section-label mb-1">Chunks / Status</p>
              <span className="text-carbon-300 font-mono">{selectedDoc.chunk_count} chunks</span>
              <span className="badge-green ml-2">Ready</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
