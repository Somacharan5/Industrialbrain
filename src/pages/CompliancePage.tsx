// CompliancePage.tsx
import { useState, useEffect } from 'react'
import { ShieldCheck, AlertTriangle, CheckCircle, Filter, RefreshCw, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { getComplianceFlags, resolveComplianceFlag } from '@/lib/supabase'
import { DEMO_FLAGS } from '@/lib/demo-data'
import type { ComplianceFlag } from '@/types'

const SEVERITY_CONFIG = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/5', border: 'border-red-500/20', dot: 'bg-red-400' },
  major:    { color: 'text-amber-400', bg: 'bg-amber-500/5', border: 'border-amber-500/20', dot: 'bg-amber-400' },
  minor:    { color: 'text-yellow-400', bg: 'bg-yellow-500/5', border: 'border-yellow-500/20', dot: 'bg-yellow-400' },
  observation: { color: 'text-blue-400', bg: 'bg-blue-500/5', border: 'border-blue-500/20', dot: 'bg-blue-400' },
}

export default function CompliancePage() {
  const [flags, setFlags] = useState<ComplianceFlag[]>(DEMO_FLAGS)
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState(false)

  const filtered = filter === 'all' ? flags : flags.filter(f => f.severity === filter || f.status === filter)
  const counts = {
    critical: flags.filter(f => f.severity === 'critical' && f.status === 'open').length,
    major: flags.filter(f => f.severity === 'major' && f.status === 'open').length,
    minor: flags.filter(f => f.severity === 'minor' && f.status === 'open').length,
    resolved: flags.filter(f => f.status === 'resolved').length,
  }

  const handleResolve = async (id: string) => {
    setFlags(prev => prev.map(f => f.id === id ? { ...f, status: 'resolved' } : f))
    if (import.meta.env.VITE_DEMO_MODE !== 'true') {
      await resolveComplianceFlag(id)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="section-label mb-1">AI Intelligence</div>
        <h1 className="text-2xl font-semibold text-carbon-100">Compliance Intelligence</h1>
        <p className="text-sm text-carbon-500 mt-0.5">
          Continuous AI monitoring against OISD, Factory Act 1948, PESO, and DGMS standards
        </p>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Critical', count: counts.critical, color: 'text-red-400', bg: 'bg-red-500/8 border-red-500/15' },
          { label: 'Major', count: counts.major, color: 'text-amber-400', bg: 'bg-amber-500/8 border-amber-500/15' },
          { label: 'Minor', count: counts.minor, color: 'text-yellow-400', bg: 'bg-yellow-500/8 border-yellow-500/15' },
          { label: 'Resolved', count: counts.resolved, color: 'text-emerald-400', bg: 'bg-emerald-500/8 border-emerald-500/15' },
        ].map(c => (
          <button
            key={c.label}
            onClick={() => setFilter(c.label.toLowerCase() === 'resolved' ? 'resolved' : c.label.toLowerCase())}
            className={`panel p-4 text-left border ${c.bg} hover:opacity-80 transition-opacity`}
          >
            <div className={`text-2xl font-bold font-mono ${c.color}`}>{c.count}</div>
            <div className="text-xs text-carbon-500 mt-0.5">{c.label} flags</div>
          </button>
        ))}
      </div>

      {/* Regulation Coverage */}
      <div className="panel p-5 mb-6">
        <p className="text-sm font-medium text-carbon-300 mb-4">Regulatory Coverage</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'OISD Standards', score: 82, clauses: 47 },
            { name: 'Factory Act 1948', score: 74, clauses: 23 },
            { name: 'PESO Norms', score: 91, clauses: 18 },
            { name: 'Env. Compliance', score: 68, clauses: 12 },
          ].map(r => (
            <div key={r.name}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-carbon-400">{r.name}</span>
                <span className={`font-mono font-medium ${r.score >= 80 ? 'text-signal-green' : r.score >= 65 ? 'text-signal-amber' : 'text-signal-red'}`}>
                  {r.score}%
                </span>
              </div>
              <div className="h-1.5 bg-carbon-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${r.score >= 80 ? 'bg-signal-green' : r.score >= 65 ? 'bg-signal-amber' : 'bg-signal-red'}`}
                  style={{ width: `${r.score}%` }}
                />
              </div>
              <div className="text-[10px] text-carbon-600 font-mono mt-0.5">{r.clauses} clauses monitored</div>
            </div>
          ))}
        </div>
      </div>

      {/* Flags */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-carbon-300">
            {filtered.length} flag{filtered.length !== 1 ? 's' : ''}
            {filter !== 'all' ? ` · ${filter}` : ''}
          </p>
          <button onClick={() => setFilter('all')} className="text-xs text-carbon-500 hover:text-carbon-300">
            {filter !== 'all' ? 'Clear filter' : ''}
          </button>
        </div>
        {filtered.map((flag, i) => {
          const cfg = SEVERITY_CONFIG[flag.severity]
          return (
            <motion.div
              key={flag.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`panel p-4 border ${cfg.border} ${cfg.bg}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${cfg.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] font-mono font-medium uppercase ${cfg.color}`}>
                      {flag.severity}
                    </span>
                    <span className="text-[10px] font-mono text-carbon-500">{flag.regulation}</span>
                    {flag.equipment_tag && (
                      <span className="badge-blue text-[10px]">{flag.equipment_tag}</span>
                    )}
                    <span className="ml-auto text-[10px] font-mono text-carbon-600">
                      {new Date(flag.detected_at).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <p className="text-sm text-carbon-300 mb-2">{flag.description}</p>
                  <div className="flex items-start gap-1.5">
                    <ShieldCheck size={10} className="text-signal-green flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-carbon-500">{flag.recommended_action}</p>
                  </div>
                </div>
                {flag.status !== 'resolved' && (
                  <button
                    onClick={() => handleResolve(flag.id)}
                    className="flex-shrink-0 flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/5 px-2 py-1 rounded transition-all"
                  >
                    <CheckCircle size={10} />
                    Resolve
                  </button>
                )}
                {flag.status === 'resolved' && (
                  <span className="flex-shrink-0 badge-green">Resolved</span>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
