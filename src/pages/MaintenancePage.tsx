import { useState } from 'react'
import { Wrench, AlertTriangle, Clock, TrendingUp, Calendar, ChevronRight, MessageSquare } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts'
import { motion } from 'framer-motion'

const EQUIPMENT_LIST = [
  { tag: 'CT-01-F5', name: 'Cooling Tower Fan F-5 Motor', vibration: 8.9, vibAlarm: 7.1, vibTrip: 9.5, temp: 92, status: 'DANGER',  daysOverdue: 14, area: 'Utilities' },
  { tag: 'CT-01-F2', name: 'Cooling Tower Fan F-2 Motor', vibration: 6.8, vibAlarm: 7.1, vibTrip: 9.5, temp: 68, status: 'WATCH',   daysOverdue: 0,  area: 'Utilities' },
  { tag: 'GD-304',   name: 'Gas Detector — Coke Oven',    vibration: null,vibAlarm: null,vibTrip: null,  temp: null,status: 'OVERDUE', daysOverdue: 47, area: 'Coke Oven' },
  { tag: 'V-302',    name: '3rd Stage Compressor',         vibration: 4.2, vibAlarm: 7.1, vibTrip: 11.2, temp: 52, status: 'OK',     daysOverdue: 0,  area: 'Compression' },
  { tag: 'P-101',    name: 'Feed Pump — Naphtha',          vibration: 3.1, vibAlarm: 7.1, vibTrip: 11.2, temp: 48, status: 'OK',     daysOverdue: 0,  area: 'FPU' },
  { tag: 'V-102',    name: 'Steam Drum',                   vibration: null,vibAlarm: null,vibTrip: null,  temp: null,status: 'CERT',  daysOverdue: 90, area: 'Boiler' },
]

const VIBRATION_TREND = [
  { month: 'Jan', 'CT-01-F5': 5.2, 'V-302': 12.4, 'P-101': 3.4 },
  { month: 'Feb', 'CT-01-F5': 5.8, 'V-302': 4.1,  'P-101': 3.2 },
  { month: 'Mar', 'CT-01-F5': 6.2, 'V-302': 4.0,  'P-101': 3.1 },
  { month: 'Apr', 'CT-01-F5': 6.8, 'V-302': 4.2,  'P-101': 3.0 },
  { month: 'May', 'CT-01-F5': 7.9, 'V-302': 4.1,  'P-101': 3.2 },
  { month: 'Jun', 'CT-01-F5': 8.9, 'V-302': 4.2,  'P-101': 3.1 },
]

const UPCOMING_PM = [
  { tag: 'P-205', task: 'Mechanical seal inspection', dueDate: '28 Jun 2026', priority: 'high' },
  { tag: 'HE-101', task: 'Heat exchanger tube cleaning', dueDate: '02 Jul 2026', priority: 'medium' },
  { tag: 'CT-01-F2', task: 'Bearing grease & vibration check', dueDate: '05 Jul 2026', priority: 'high' },
  { tag: 'V-302', task: 'Coupling element replacement', dueDate: '10 Jul 2026', priority: 'high' },
  { tag: 'P-101', task: 'Impeller clearance check', dueDate: '15 Jul 2026', priority: 'low' },
  { tag: 'GD-304', task: 'Calibration (OVERDUE)', dueDate: 'IMMEDIATE', priority: 'critical' },
]

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  DANGER:  { label: 'DANGER',  color: 'text-red-400',    bg: 'bg-red-500/5',    border: 'border-red-500/20' },
  WATCH:   { label: 'WATCH',   color: 'text-amber-400',  bg: 'bg-amber-500/5',  border: 'border-amber-500/20' },
  OVERDUE: { label: 'OVERDUE', color: 'text-orange-400', bg: 'bg-orange-500/5', border: 'border-orange-500/20' },
  CERT:    { label: 'CERT EXP',color: 'text-red-400',    bg: 'bg-red-500/5',    border: 'border-red-500/20' },
  OK:      { label: 'OK',      color: 'text-emerald-400',bg: 'bg-emerald-500/5',border: 'border-emerald-500/20' },
}

export default function MaintenancePage() {
  const navigate = useNavigate()
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'watch' | 'schedule' | 'trends'>('watch')

  const alertCount = EQUIPMENT_LIST.filter(e => ['DANGER', 'OVERDUE', 'CERT'].includes(e.status)).length

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="section-label mb-1">AI Intelligence</div>
          <h1 className="text-2xl font-semibold text-carbon-100">Maintenance AI</h1>
          <p className="text-sm text-carbon-500 mt-0.5">PdM analysis · OEM interval compliance · Failure pattern detection</p>
        </div>
        <button
          onClick={() => navigate('/query?q=Generate a maintenance schedule for all critical rotating equipment')}
          className="btn-primary"
        >
          <MessageSquare size={14} />
          Ask Maintenance AI
        </button>
      </div>

      {/* Alert bar */}
      {alertCount > 0 && (
        <div className="mb-6 p-3 rounded-lg border border-red-500/20 bg-red-500/5 flex items-center gap-3">
          <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-400 font-medium">{alertCount} items require immediate attention</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-carbon-900 rounded-lg border border-white/5 w-fit mb-6">
        {[
          { id: 'watch', label: 'Equipment Watch', icon: <AlertTriangle size={12} /> },
          { id: 'schedule', label: 'PM Schedule', icon: <Calendar size={12} /> },
          { id: 'trends', label: 'Vibration Trends', icon: <TrendingUp size={12} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-all
              ${activeTab === tab.id
                ? 'bg-signal-green/10 text-signal-green border border-signal-green/20'
                : 'text-carbon-500 hover:text-carbon-300'}`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Equipment Watch */}
      {activeTab === 'watch' && (
        <div className="space-y-3">
          {EQUIPMENT_LIST.map((eq, i) => {
            const cfg = STATUS_CFG[eq.status]
            const vibPct = eq.vibration && eq.vibTrip ? (eq.vibration / eq.vibTrip) * 100 : null
            return (
              <motion.div
                key={eq.tag}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`panel p-4 border cursor-pointer hover:border-white/20 transition-all ${cfg.border} ${cfg.bg}`}
                onClick={() => setSelectedTag(selectedTag === eq.tag ? null : eq.tag)}
              >
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4">
                  <div className="flex-shrink-0 w-20">
                    <span className="badge-blue font-mono text-xs">{eq.tag}</span>
                  </div>
                  <div className="flex-1 min-w-[140px] sm:min-w-0">
                    <p className="text-sm text-carbon-200 truncate">{eq.name}</p>
                    <p className="text-[10px] text-carbon-600 font-mono">{eq.area}</p>
                  </div>
                  {eq.vibration !== null && eq.vibTrip !== null && (
                    <div className="w-32 flex-shrink-0">
                      <div className="flex justify-between text-[10px] font-mono mb-1">
                        <span className="text-carbon-500">Vib.</span>
                        <span className={cfg.color}>{eq.vibration} mm/s</span>
                      </div>
                      <div className="h-1.5 bg-carbon-800 rounded-full overflow-hidden relative">
                        <div className="absolute inset-y-0 bg-amber-500/30 rounded-full" style={{ width: `${(eq.vibAlarm! / eq.vibTrip) * 100}%` }} />
                        <div
                          className={`h-full rounded-full relative ${eq.status === 'DANGER' ? 'bg-red-400' : eq.status === 'WATCH' ? 'bg-amber-400' : 'bg-signal-green'}`}
                          style={{ width: `${Math.min(100, vibPct!)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {eq.daysOverdue > 0 && (
                    <div className="flex-shrink-0 text-right">
                      <p className={`text-xs font-mono font-medium ${cfg.color}`}>{eq.daysOverdue}d overdue</p>
                    </div>
                  )}
                  <span className={`flex-shrink-0 text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${cfg.color} ${cfg.border} ${cfg.bg}`}>
                    {cfg.label}
                  </span>
                  <ChevronRight size={12} className={`text-carbon-600 flex-shrink-0 transition-transform ${selectedTag === eq.tag ? 'rotate-90' : ''}`} />
                </div>

                {selectedTag === eq.tag && (
                  <div className="mt-4 pt-4 border-t border-white/5 flex gap-3">
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/query?q=What is the maintenance history and recommended action for ${eq.tag}?`) }}
                      className="btn-primary text-xs"
                    >
                      <MessageSquare size={12} /> Ask AI about {eq.tag}
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/rca`) }}
                      className="btn-secondary text-xs"
                    >
                      Run RCA
                    </button>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      {/* PM Schedule */}
      {activeTab === 'schedule' && (
        <div className="panel p-5">
          <p className="text-sm font-medium text-carbon-300 mb-4">Upcoming Planned Maintenance</p>
          <div className="space-y-2">
            {UPCOMING_PM.map((pm, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center gap-4 p-3 rounded-lg border ${
                  pm.priority === 'critical' ? 'border-red-500/20 bg-red-500/5' :
                  pm.priority === 'high' ? 'border-amber-500/15 bg-amber-500/3' :
                  'border-white/5 bg-white/2'
                }`}
              >
                <span className="badge-blue font-mono text-xs w-20 flex-shrink-0 text-center">{pm.tag}</span>
                <span className="text-sm text-carbon-300 flex-1">{pm.task}</span>
                <span className={`text-xs font-mono flex-shrink-0 ${
                  pm.dueDate === 'IMMEDIATE' ? 'text-red-400 font-bold' :
                  pm.priority === 'high' ? 'text-amber-400' : 'text-carbon-500'
                }`}>{pm.dueDate}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Vibration Trends */}
      {activeTab === 'trends' && (
        <div className="panel p-5">
          <p className="text-sm font-medium text-carbon-300 mb-1">6-Month Vibration Trend (mm/s RMS)</p>
          <p className="text-xs text-carbon-600 font-mono mb-4">Alarm limit: 7.1 mm/s — Trip limit: 9.5–11.2 mm/s</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={VIBRATION_TREND} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fill: '#666', fontSize: 11, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#666', fontSize: 11, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1e1e16', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: '#888' }}
              />
              <ReferenceLine y={7.1} stroke="#f5a623" strokeDasharray="4 3" strokeOpacity={0.5} label={{ value: 'Alarm', fill: '#f5a623', fontSize: 10, position: 'right' }} />
              <ReferenceLine y={9.5} stroke="#e8453c" strokeDasharray="4 3" strokeOpacity={0.5} label={{ value: 'Trip', fill: '#e8453c', fontSize: 10, position: 'right' }} />
              <Line type="monotone" dataKey="CT-01-F5" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} name="CT-01-F5" />
              <Line type="monotone" dataKey="V-302"    stroke="#3b82f6" strokeWidth={1.5} dot={{ fill: '#3b82f6', r: 2 }} name="V-302" />
              <Line type="monotone" dataKey="P-101"    stroke="#10b981" strokeWidth={1.5} dot={{ fill: '#10b981', r: 2 }} name="P-101" />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-3 text-xs font-mono">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-red-400 inline-block" /> CT-01-F5 (DANGER)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-400 inline-block" /> V-302 (OK)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-400 inline-block" /> P-101 (OK)</span>
          </div>
        </div>
      )}
    </div>
  )
}
