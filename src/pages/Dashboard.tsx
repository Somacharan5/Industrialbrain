import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, GitFork, AlertTriangle, ShieldCheck,
  Activity, MessageSquare, TrendingUp, Clock,
  Zap, ArrowRight, ChevronUp
} from 'lucide-react'
import { getDashboardStats, getComplianceFlags } from '@/lib/supabase'
import type { DashboardStats, ComplianceFlag } from '@/types'
import { DEMO_STATS, DEMO_FLAGS, DEMO_ACTIVITY } from '@/lib/demo-data'

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats>(DEMO_STATS)
  const [flags, setFlags] = useState<ComplianceFlag[]>(DEMO_FLAGS)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (import.meta.env.VITE_DEMO_MODE !== 'true') {
      setLoading(true)
      Promise.all([getDashboardStats(), getComplianceFlags('open')])
        .then(([s, f]) => { setStats(s); setFlags(f) })
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [])

  const criticalFlags = flags.filter(f => f.severity === 'critical')
  const majorFlags = flags.filter(f => f.severity === 'major')

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="section-label mb-1">Industrial Brain</div>
          <h1 className="text-2xl font-semibold text-carbon-100">Command Centre</h1>
          <p className="text-sm text-carbon-500 mt-0.5 font-mono">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="signal-dot bg-signal-green text-signal-green" />
          <span className="text-xs text-signal-green font-mono">SYSTEM LIVE</span>
        </div>
      </div>

      {/* Alert Banner */}
      {criticalFlags.length > 0 && (
        <div
          className="mb-6 p-4 rounded-lg border border-red-500/30 bg-red-500/5 flex items-center justify-between cursor-pointer hover:bg-red-500/8 transition-colors"
          onClick={() => navigate('/compliance')}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-red-400">
                {criticalFlags.length} Critical Compliance Flag{criticalFlags.length > 1 ? 's' : ''} Open
              </span>
              <p className="text-xs text-carbon-400 mt-0.5">{criticalFlags[0]?.description}</p>
            </div>
          </div>
          <ArrowRight size={14} className="text-red-400" />
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="panel p-4 animate-pulse">
              <div className="w-7 h-7 rounded bg-white/5 mb-3" />
              <div className="h-5 w-16 bg-white/5 rounded mb-2" />
              <div className="h-3 w-24 bg-white/5 rounded mb-1.5" />
              <div className="h-2.5 w-20 bg-white/5 rounded" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              label="Documents Ingested"
              value={stats.total_documents.toLocaleString()}
              sub={`${stats.total_chunks.toLocaleString()} chunks`}
              icon={<FileText size={14} />}
              color="blue"
              onClick={() => navigate('/documents')}
            />
            <StatCard
              label="Knowledge Entities"
              value={stats.total_entities.toLocaleString()}
              sub={`${stats.knowledge_graph_edges.toLocaleString()} relationships`}
              icon={<GitFork size={14} />}
              color="purple"
              onClick={() => navigate('/graph')}
            />
            <StatCard
              label="Compliance Score"
              value={`${stats.compliance_score}%`}
              sub={`${stats.active_flags} open flags`}
              icon={<ShieldCheck size={14} />}
              color={stats.compliance_score >= 80 ? 'green' : stats.compliance_score >= 60 ? 'amber' : 'red'}
              onClick={() => navigate('/compliance')}
            />
            <StatCard
              label="Stale Documents"
              value={stats.stale_documents.toString()}
              sub="need review"
              icon={<Activity size={14} />}
              color={stats.stale_documents > 10 ? 'amber' : 'green'}
              onClick={() => navigate('/health')}
            />
          </>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Query */}
        <div className="lg:col-span-2">
          <div className="panel p-5 h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare size={14} className="text-signal-green" />
                <span className="text-sm font-medium text-carbon-200">Quick Query</span>
              </div>
              <button
                onClick={() => navigate('/query')}
                className="text-xs text-signal-green hover:text-signal-green/80 flex items-center gap-1"
              >
                Full copilot <ArrowRight size={10} />
              </button>
            </div>
            <QuickQueryBox />
          </div>
        </div>

        {/* Compliance Status */}
        <div className="panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-signal-amber" />
              <span className="text-sm font-medium text-carbon-200">Compliance Status</span>
            </div>
            <button
              onClick={() => navigate('/compliance')}
              className="text-xs text-carbon-500 hover:text-carbon-300 flex items-center gap-1"
            >
              View all <ArrowRight size={10} />
            </button>
          </div>
          <div className="space-y-3">
            <ComplianceMeter label="OISD Standards" value={82} />
            <ComplianceMeter label="Factory Act 1948" value={74} />
            <ComplianceMeter label="PESO Norms" value={91} />
            <ComplianceMeter label="Env. Compliance" value={68} />
          </div>
          <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
            {flags.slice(0, 3).map(f => (
              <div key={f.id} className="flex items-start gap-2">
                <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full mt-1.5
                  ${f.severity === 'critical' ? 'bg-red-400' :
                    f.severity === 'major' ? 'bg-amber-400' : 'bg-yellow-400'}`}
                />
                <p className="text-xs text-carbon-400 leading-relaxed line-clamp-2">{f.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={14} className="text-carbon-400" />
            <span className="text-sm font-medium text-carbon-200">Recent Queries</span>
          </div>
          <div className="space-y-2">
            {DEMO_ACTIVITY.map((a, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/3 cursor-pointer transition-colors"
                onClick={() => navigate('/query')}
              >
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5
                  ${a.mode === 'compliance' ? 'bg-amber-500/10 text-amber-400' :
                    a.mode === 'rca' ? 'bg-red-500/10 text-red-400' :
                    a.mode === 'maintenance' ? 'bg-blue-500/10 text-blue-400' :
                    'bg-signal-green/10 text-signal-green'}`}
                >
                  {a.mode}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-carbon-300 truncate">{a.question}</p>
                  <p className="text-[10px] text-carbon-600 mt-0.5 font-mono">{a.time} · {a.citations} citations</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={14} className="text-signal-green" />
            <span className="text-sm font-medium text-carbon-200">System Status</span>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Vector DB', status: 'Operational', ok: true },
              { label: 'Knowledge Graph', status: 'Operational', ok: true },
              { label: 'AI Engine (Claude)', status: 'Operational', ok: true },
              { label: 'Ingestion Pipeline', status: 'Idle', ok: true },
              { label: 'Compliance Checker', status: 'Active scan', ok: true },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-xs text-carbon-400">{s.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`signal-dot ${s.ok ? 'bg-signal-green text-signal-green' : 'bg-signal-red text-signal-red'}`} />
                  <span className={`text-[10px] font-mono ${s.ok ? 'text-signal-green' : 'text-signal-red'}`}>
                    {s.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-carbon-500 font-mono">Avg response time</span>
              <span className="text-signal-green font-mono">{stats.avg_response_time_ms || 1240}ms</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-carbon-500 font-mono">Queries today</span>
              <span className="text-carbon-300 font-mono">{stats.queries_today || 47}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon, color, onClick
}: {
  label: string; value: string; sub: string; icon: React.ReactNode
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple'
  onClick: () => void
}) {
  const colors = {
    blue:   'text-blue-400 bg-blue-500/8 border-blue-500/15',
    green:  'text-emerald-400 bg-emerald-500/8 border-emerald-500/15',
    amber:  'text-amber-400 bg-amber-500/8 border-amber-500/15',
    red:    'text-red-400 bg-red-500/8 border-red-500/15',
    purple: 'text-purple-400 bg-purple-500/8 border-purple-500/15',
  }

  return (
    <button
      onClick={onClick}
      className={`panel p-4 text-left w-full hover:border-white/15 transition-all duration-200 group`}
    >
      <div className={`w-7 h-7 rounded border flex items-center justify-center mb-3 ${colors[color]}`}>
        {icon}
      </div>
      <div className="text-xl font-semibold text-carbon-100 font-mono tabular-nums">{value}</div>
      <div className="text-xs text-carbon-400 mt-0.5">{label}</div>
      <div className="text-[10px] text-carbon-600 font-mono mt-1">{sub}</div>
    </button>
  )
}

function ComplianceMeter({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? 'bg-signal-green' : value >= 60 ? 'bg-signal-amber' : 'bg-signal-red'
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-carbon-400">{label}</span>
        <span className={`text-xs font-mono font-medium
          ${value >= 80 ? 'text-signal-green' : value >= 60 ? 'text-signal-amber' : 'text-signal-red'}`}
        >
          {value}%
        </span>
      </div>
      <div className="compliance-bar">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

function QuickQueryBox() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const suggestions = [
    'What is the last inspection date for P-101?',
    'List all OISD violations in area 3B',
    'Maintenance history of V-302 compressor',
    'What procedures apply to hot work in the coke oven area?',
  ]

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          className="query-input"
          placeholder="Ask anything about plant operations, equipment, compliance…"
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && q.trim()) {
              navigate(`/query?q=${encodeURIComponent(q)}`)
            }
          }}
        />
        <button
          onClick={() => q.trim() && navigate(`/query?q=${encodeURIComponent(q)}`)}
          className="btn-primary flex-shrink-0"
        >
          <MessageSquare size={14} />
          Ask
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {suggestions.map(s => (
          <button
            key={s}
            onClick={() => navigate(`/query?q=${encodeURIComponent(s)}`)}
            className="text-[11px] text-carbon-500 hover:text-carbon-300 bg-white/3 hover:bg-white/6
                       border border-white/5 rounded px-2 py-1 transition-all duration-150 text-left"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

function useState2<T>(initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  return useState<T>(initial)
}
