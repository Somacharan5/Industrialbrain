// ─── MaintenancePage.tsx ──────────────────────────────────────────────────────
// Claude Code: Expand with real maintenance schedule, PM calendar, vibration trends
export function MaintenancePage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="section-label mb-1">AI Intelligence</div>
      <h1 className="text-2xl font-semibold text-carbon-100 mb-1">Maintenance AI</h1>
      <p className="text-sm text-carbon-500 mb-6">Predictive maintenance powered by PdM records, OEM manuals, and failure pattern analysis</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'PM Overdue', value: '4', color: 'text-red-400' },
          { label: 'Due This Week', value: '7', color: 'text-amber-400' },
          { label: 'Completed This Month', value: '23', color: 'text-signal-green' },
        ].map(s => (
          <div key={s.label} className="panel p-4">
            <div className={`text-3xl font-bold font-mono ${s.color}`}>{s.value}</div>
            <div className="text-xs text-carbon-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="panel p-5">
        <p className="text-sm font-medium text-carbon-300 mb-4">Equipment Status — Critical Watch List</p>
        <div className="space-y-3">
          {[
            { tag: 'CT-01-F5', name: 'Cooling Tower Fan F-5 Motor', vibration: '8.9 mm/s', temp: '92°C', status: 'DANGER', dueIn: '2 weeks' },
            { tag: 'CT-01-F2', name: 'Cooling Tower Fan F-2 Motor', vibration: '6.8 mm/s', temp: '68°C', status: 'ALARM', dueIn: '1 month' },
            { tag: 'GD-304', name: 'Gas Detector — Coke Oven', vibration: '—', temp: '—', status: 'OVERDUE', dueIn: 'NOW' },
            { tag: 'V-302', name: '3rd Stage Compressor', vibration: '4.2 mm/s', temp: '52°C', status: 'OK', dueIn: '3 months' },
          ].map(eq => (
            <div key={eq.tag} className="flex items-center gap-4 p-3 rounded-lg bg-white/2 border border-white/5">
              <span className="badge-blue font-mono text-xs w-20 flex-shrink-0">{eq.tag}</span>
              <span className="text-sm text-carbon-300 flex-1 truncate">{eq.name}</span>
              <span className="text-xs font-mono text-carbon-500 w-20 text-right">{eq.vibration}</span>
              <span className="text-xs font-mono text-carbon-500 w-14 text-right">{eq.temp}</span>
              <span className={`text-[10px] font-mono w-16 text-right flex-shrink-0
                ${eq.status === 'DANGER' ? 'text-red-400' :
                  eq.status === 'ALARM' || eq.status === 'OVERDUE' ? 'text-amber-400' : 'text-signal-green'}`}
              >
                {eq.status}
              </span>
              <span className="text-[10px] font-mono text-carbon-600 w-20 text-right flex-shrink-0">{eq.dueIn}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── DocumentsPage.tsx ─────────────────────────────────────────────────────────
export function DocumentsPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="section-label mb-1">Knowledge Base</div>
      <h1 className="text-2xl font-semibold text-carbon-100 mb-1">Document Library</h1>
      <p className="text-sm text-carbon-500 mb-6">All ingested documents with their extracted entities and knowledge graph connections</p>
      <div className="panel p-5">
        <p className="text-sm text-carbon-400">
          Claude Code: Build document table with search, type filter, equipment tag filter, staleness indicator, and click-to-view-chunks.
          Use <code className="text-signal-green font-mono text-xs">getDocuments()</code> from supabase.ts
        </p>
        <div className="mt-4 space-y-2">
          {['SOP-MAINT-047 — Feed Pump P-101 Isolation', 'OISD-118 Third Revision 2019', 'WO-2026-1847 — V-302 Investigation', 'IIR-2025-014 — Coke Oven Near-Miss', 'EDS-FPU-P101 — Equipment Data Sheet'].map(d => (
            <div key={d} className="flex items-center gap-3 p-3 rounded-lg bg-white/2 border border-white/5">
              <span className="text-xs text-carbon-300">{d}</span>
              <span className="ml-auto badge-green">Ready</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── KnowledgeHealthPage.tsx ───────────────────────────────────────────────────
export function KnowledgeHealthPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="section-label mb-1">AI Intelligence</div>
      <h1 className="text-2xl font-semibold text-carbon-100 mb-1">Knowledge Health</h1>
      <p className="text-sm text-carbon-500 mb-6">
        Staleness detection — surfaces documents that are likely outdated before they become a safety issue.
        The AI scores each document against type-specific review thresholds.
      </p>
      <div className="panel p-5 mb-4">
        <p className="text-sm font-medium text-carbon-300 mb-4">Staleness Leaderboard</p>
        <div className="space-y-3">
          {[
            { title: 'Emergency Response Plan — Coke Oven Area', type: 'procedure', days: 412, score: 112, risk: 'critical' },
            { title: 'Permit-to-Work Register — Q2 2025', type: 'qa_record', days: 278, score: 93, risk: 'critical' },
            { title: 'OISD-118 Compliance Checklist — Jan 2025', type: 'inspection', days: 173, score: 87, risk: 'high' },
            { title: 'V-102 Steam Drum IBR Certificate', type: 'regulatory', days: 95, score: 72, risk: 'high' },
            { title: 'P-101 Mechanical Seal OEM Manual', type: 'oem_manual', days: 1140, score: 62, risk: 'medium' },
          ].map(d => (
            <div key={d.title} className="flex items-center gap-4 p-3 rounded-lg bg-white/2 border border-white/5">
              <div className={`w-2 h-2 rounded-full flex-shrink-0
                ${d.risk === 'critical' ? 'bg-red-400' : d.risk === 'high' ? 'bg-amber-400' : 'bg-yellow-400'}`} />
              <span className="text-xs text-carbon-300 flex-1 truncate">{d.title}</span>
              <span className="badge-blue text-[10px] flex-shrink-0">{d.type}</span>
              <span className="text-xs font-mono text-carbon-500 flex-shrink-0">{d.days}d ago</span>
              <div className="w-24 h-1.5 bg-carbon-800 rounded-full overflow-hidden flex-shrink-0">
                <div
                  className={`h-full rounded-full ${d.risk === 'critical' ? 'bg-red-400' : d.risk === 'high' ? 'bg-amber-400' : 'bg-yellow-400'}`}
                  style={{ width: `${Math.min(100, d.score)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="panel p-4">
        <p className="text-xs text-carbon-400">
          Claude Code: Connect to <code className="text-signal-green font-mono">detectKnowledgeDecay()</code> from gemini.ts.
          Add filters by doc_type, risk level, and plant area. Add "Request Review" action that creates a maintenance task.
        </p>
      </div>
    </div>
  )
}

// ─── FieldAssistPage.tsx ───────────────────────────────────────────────────────
export function FieldAssistPage() {
  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="section-label mb-1">Field Tools</div>
      <h1 className="text-2xl font-semibold text-carbon-100 mb-1">Field Assist</h1>
      <p className="text-sm text-carbon-500 mb-6">Mobile-optimized AI assistant for plant technicians and operators. Simple answers. Safety first.</p>
      <div className="panel p-4 mb-4 border border-amber-500/20 bg-amber-500/5">
        <p className="text-xs text-amber-400 font-medium mb-1">Safety Mode Active</p>
        <p className="text-xs text-carbon-400">Every response leads with the critical safety precaution. Designed for use in the plant.</p>
      </div>
      <div className="space-y-2 mb-6">
        {['How do I isolate P-101 before maintenance?', 'What PPE for H2S above 10 ppm?', 'Emergency stop steps for V-302 compressor', 'Where is the nearest eyewash station in Area 3B?'].map(q => (
          <button key={q} className="w-full text-left text-sm text-carbon-300 p-3 panel hover:border-white/15 transition-all">
            {q}
          </button>
        ))}
      </div>
      <p className="text-xs text-carbon-600 text-center font-mono">
        Claude Code: Use QueryPage with mode='field' as the implementation. Add voice input via Web Speech API.
      </p>
    </div>
  )
}

// Re-export as defaults for router
export default MaintenancePage
