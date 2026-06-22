import { useState, useEffect } from 'react'
import { Activity, AlertTriangle, CheckCircle, Clock, RefreshCw, MessageSquare, Filter } from 'lucide-react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useNavigate } from 'react-router-dom'
import { detectKnowledgeDecay } from '@/lib/gemini'
import type { KnowledgeHealthItem } from '@/types'

const DEMO_HEALTH: KnowledgeHealthItem[] = [
  { document_id: 'd1', title: 'Emergency Response Plan — Coke Oven Area', doc_type: 'procedure', last_accessed: '2026-06-10T00:00:00Z', last_modified: '2025-04-02T00:00:00Z', days_since_update: 447, staleness_score: 100, risk: 'critical', reason: 'Procedure doc not updated in 447 days — exceeds 365-day threshold', equipment_tags: [] },
  { document_id: 'd2', title: 'Permit-to-Work Register — Q2 2025', doc_type: 'qa_record', last_accessed: '2026-05-01T00:00:00Z', last_modified: '2025-09-15T00:00:00Z', days_since_update: 280, staleness_score: 93, risk: 'critical', reason: 'QA record not updated in 280 days — exceeds 90-day threshold', equipment_tags: [] },
  { document_id: 'd3', title: 'OISD-118 Compliance Checklist — Jan 2025', doc_type: 'inspection', last_accessed: '2026-04-20T00:00:00Z', last_modified: '2025-12-28T00:00:00Z', days_since_update: 176, staleness_score: 87, risk: 'high', reason: 'Inspection report approaching review threshold', equipment_tags: ['GD-301'] },
  { document_id: 'd4', title: 'V-102 Steam Drum IBR Certificate', doc_type: 'regulatory', last_accessed: '2026-06-17T00:00:00Z', last_modified: '2026-03-15T00:00:00Z', days_since_update: 99, staleness_score: 73, risk: 'high', reason: 'Regulatory doc at 73% of 180-day renewal threshold', equipment_tags: ['V-102'] },
  { document_id: 'd5', title: 'P-101 Mechanical Seal OEM Manual', doc_type: 'oem_manual', last_accessed: '2026-05-12T00:00:00Z', last_modified: '2023-02-10T00:00:00Z', days_since_update: 1227, staleness_score: 67, risk: 'medium', reason: 'Moderate staleness — review recommended for accuracy vs current OEM specs', equipment_tags: ['P-101'] },
  { document_id: 'd6', title: 'Area 2 Fire Fighting Audit — 2024', doc_type: 'inspection', last_accessed: '2025-12-01T00:00:00Z', last_modified: '2025-08-12T00:00:00Z', days_since_update: 314, staleness_score: 61, risk: 'medium', reason: 'Annual inspection due — approaching renewal', equipment_tags: [] },
  { document_id: 'd7', title: 'V-302 Compressor OEM Manual Rev 4', doc_type: 'oem_manual', last_accessed: '2026-04-16T00:00:00Z', last_modified: '2021-06-01T00:00:00Z', days_since_update: 1847, staleness_score: 40, risk: 'low', reason: 'OEM manuals have 5-year review cycle — within threshold', equipment_tags: ['V-302'] },
  { document_id: 'd8', title: 'CT-01 Fan Motors PdM Records', doc_type: 'maintenance', last_accessed: '2026-06-10T00:00:00Z', last_modified: '2026-06-10T00:00:00Z', days_since_update: 12, staleness_score: 7, risk: 'low', reason: 'Recently updated', equipment_tags: ['CT-01'] },
]

const STALE_BY_TYPE = [
  { type: 'qa_record', critical: 2, high: 1, medium: 0 },
  { type: 'inspection', critical: 1, high: 2, medium: 1 },
  { type: 'procedure', critical: 2, high: 1, medium: 2 },
  { type: 'regulatory', critical: 0, high: 2, medium: 1 },
  { type: 'maintenance', critical: 0, high: 0, medium: 3 },
]

const RISK_CFG = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/5', border: 'border-red-500/20', bar: '#ef4444' },
  high:     { color: 'text-amber-400', bg: 'bg-amber-500/5', border: 'border-amber-500/20', bar: '#f59e0b' },
  medium:   { color: 'text-yellow-400', bg: 'bg-yellow-500/5', border: 'border-yellow-500/20', bar: '#eab308' },
  low:      { color: 'text-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20', bar: '#10b981' },
}

export default function KnowledgeHealthPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<KnowledgeHealthItem[]>(DEMO_HEALTH)
  const [filterRisk, setFilterRisk] = useState<string>('all')
  const [scanning, setScanning] = useState(false)

  const filtered = filterRisk === 'all' ? items : items.filter(i => i.risk === filterRisk)
  const counts = {
    critical: items.filter(i => i.risk === 'critical').length,
    high: items.filter(i => i.risk === 'high').length,
    medium: items.filter(i => i.risk === 'medium').length,
    low: items.filter(i => i.risk === 'low').length,
  }

  const runScan = async () => {
    setScanning(true)
    await new Promise(r => setTimeout(r, 1800))
    setScanning(false)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="section-label mb-1">AI Intelligence</div>
          <h1 className="text-2xl font-semibold text-carbon-100">Knowledge Health</h1>
          <p className="text-sm text-carbon-500 mt-0.5">
            Automatic staleness detection — surfaces outdated documents before they become a safety risk
          </p>
        </div>
        <button onClick={runScan} disabled={scanning} className="btn-secondary">
          {scanning ? <><RefreshCw size={14} className="animate-spin" /> Scanning…</> : <><RefreshCw size={14} /> Run scan</>}
        </button>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {(['critical', 'high', 'medium', 'low'] as const).map(r => {
          const cfg = RISK_CFG[r]
          return (
            <button key={r} onClick={() => setFilterRisk(filterRisk === r ? 'all' : r)} className={`panel p-4 text-left border hover:opacity-80 transition-opacity ${cfg.border} ${cfg.bg}`}>
              <div className={`text-2xl font-bold font-mono ${cfg.color}`}>{counts[r]}</div>
              <div className="text-xs text-carbon-500 mt-0.5 capitalize">{r} staleness</div>
            </button>
          )
        })}
      </div>

      {/* Stale by type chart */}
      <div className="panel p-5 mb-6">
        <p className="text-sm font-medium text-carbon-300 mb-4">Staleness by Document Type</p>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={STALE_BY_TYPE} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
            <XAxis dataKey="type" tick={{ fill: '#666', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#1e1e16', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
            <Bar dataKey="critical" stackId="a" fill="#ef4444" opacity={0.8} radius={[0, 0, 0, 0]} name="Critical" />
            <Bar dataKey="high"     stackId="a" fill="#f59e0b" opacity={0.8} name="High" />
            <Bar dataKey="medium"   stackId="a" fill="#eab308" opacity={0.7} radius={[3, 3, 0, 0]} name="Medium" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Document list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-carbon-300">
            {filtered.length} document{filtered.length !== 1 ? 's' : ''}
            {filterRisk !== 'all' ? ` · ${filterRisk} staleness` : ''}
          </p>
          {filterRisk !== 'all' && (
            <button onClick={() => setFilterRisk('all')} className="text-xs text-carbon-500 hover:text-carbon-300">Clear filter</button>
          )}
        </div>
        {filtered.map((item, i) => {
          const cfg = RISK_CFG[item.risk]
          return (
            <motion.div
              key={item.document_id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`panel p-4 border ${cfg.border} ${cfg.bg}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] font-mono font-medium uppercase ${cfg.color}`}>{item.risk}</span>
                    <span className="text-[10px] font-mono text-carbon-600 bg-carbon-800 px-1.5 py-0.5 rounded">{item.doc_type}</span>
                    {item.equipment_tags.map(t => <span key={t} className="badge-blue text-[9px]">{t}</span>)}
                  </div>
                  <p className="text-sm text-carbon-200 truncate">{item.title}</p>
                  <p className="text-xs text-carbon-500 mt-0.5">{item.reason}</p>
                </div>
                <div className="flex-shrink-0 w-full sm:w-28">
                  <div className="flex justify-between text-[10px] font-mono mb-1">
                    <span className="text-carbon-600">Age</span>
                    <span className={cfg.color}>{item.days_since_update}d</span>
                  </div>
                  <div className="h-1.5 bg-carbon-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, item.staleness_score)}%`, background: cfg.bar }} />
                  </div>
                </div>
                <div className="flex-shrink-0 flex flex-col gap-1.5">
                  <button
                    onClick={() => navigate(`/query?q=Is the document "${item.title}" still accurate and up to date?`)}
                    className="btn-primary text-[10px] py-1"
                  >
                    <MessageSquare size={10} /> Ask AI
                  </button>
                </div>
              </div>
            </motion.div>
          )
        })}
        {filtered.length === 0 && (
          <div className="panel p-8 text-center">
            <CheckCircle size={20} className="text-carbon-600 mx-auto mb-2" />
            <p className="text-sm text-carbon-400">No documents match this filter</p>
            <button onClick={() => setFilterRisk('all')} className="text-xs text-signal-green hover:text-signal-green/80 mt-2">
              Clear filter
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
