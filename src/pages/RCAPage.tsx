import { useState } from 'react'
import { AlertTriangle, Search, Loader2, ChevronRight, Clock, Zap, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { generateRCA } from '@/lib/gemini'
import { DEMO_RCA, DEMO_CHUNKS } from '@/lib/demo-data'
import type { RCAResult } from '@/types'

const PRIORITY_COLORS = {
  immediate:   'text-red-400 bg-red-500/10 border-red-500/20',
  short_term:  'text-amber-400 bg-amber-500/10 border-amber-500/20',
  long_term:   'text-blue-400 bg-blue-500/10 border-blue-500/20',
}

const CAUSE_COLORS = {
  equipment:     'text-blue-400',
  human:         'text-amber-400',
  process:       'text-purple-400',
  environmental: 'text-green-400',
  organizational:'text-red-400',
}

export default function RCAPage() {
  const [equipment, setEquipment] = useState('')
  const [problem, setProblem] = useState('')
  const [result, setResult] = useState<RCAResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleRCA = async () => {
    if (!equipment.trim() || !problem.trim()) return
    setLoading(true)
    setStreamText('')
    setResult(null)
    setError(null)

    try {
      if (import.meta.env.VITE_DEMO_MODE === 'true') {
        // Simulate streaming for demo
        await new Promise(r => setTimeout(r, 1500))
        setResult({ ...DEMO_RCA, equipment_tag: equipment, problem_statement: problem } as RCAResult)
      } else {
        const contextChunks = DEMO_CHUNKS.filter(c =>
          c.content.toLowerCase().includes(equipment.toLowerCase())
        ).map(c => ({ content: c.content, source: c.source }))

        const rcaResult = await generateRCA(
          equipment, problem, contextChunks,
          (chunk) => setStreamText(prev => prev + chunk)
        )
        setResult(rcaResult)
      }
    } catch (err) {
      console.error(err)
      setError('RCA analysis failed — the AI service may be unavailable. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="section-label mb-1">AI Agents</div>
        <h1 className="text-2xl font-semibold text-carbon-100">Root Cause Analysis Agent</h1>
        <p className="text-sm text-carbon-500 mt-0.5">
          AI-powered RCA using 5-Why + Fishbone methodology over your full document corpus
        </p>
      </div>

      {/* Input */}
      <div className="panel p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-carbon-500 block mb-1">Equipment Tag</label>
            <input
              value={equipment}
              onChange={e => setEquipment(e.target.value)}
              placeholder="e.g. V-302, P-101, CT-01-F5"
              className="query-input"
            />
          </div>
          <div>
            <label className="text-xs text-carbon-500 block mb-1">Problem Statement</label>
            <input
              value={problem}
              onChange={e => setProblem(e.target.value)}
              placeholder="e.g. Recurring high vibration causing unplanned shutdown"
              className="query-input"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleRCA}
            disabled={loading || !equipment.trim() || !problem.trim()}
            className="btn-primary"
          >
            {loading
              ? <><Loader2 size={14} className="animate-spin" /> Analyzing…</>
              : <><Search size={14} /> Run RCA</>
            }
          </button>
          <button
            onClick={() => { setEquipment('V-302'); setProblem('Recurring high vibration causing unplanned shutdowns') }}
            className="btn-secondary text-xs"
          >
            Load demo: V-302 compressor
          </button>
          <span className="text-xs text-carbon-600 font-mono lg:ml-auto">
            Cross-references: Maintenance records, incident reports, OEM manuals, OISD standards
          </span>
        </div>
      </div>

      {/* Streaming indicator */}
      {loading && (
        <div className="panel p-4 mb-4 font-mono text-xs text-carbon-500">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={12} className="text-signal-green animate-pulse" />
            <span className="text-signal-green">RCA Agent running…</span>
          </div>
          <p className="line-clamp-4 text-carbon-600">{streamText || 'Searching knowledge base for relevant maintenance records, incident reports, and equipment documentation…'}</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="panel p-4 mb-4 border border-red-500/20 bg-red-500/5 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="panel p-10 text-center">
          <AlertTriangle size={22} className="text-carbon-600 mx-auto mb-3" />
          <p className="text-sm text-carbon-400">Enter an equipment tag and problem statement to run an RCA</p>
          <p className="text-xs text-carbon-600 mt-1">Or click "Load demo: V-302 compressor" above to see a sample report</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {/* Summary */}
          <div className="panel p-5">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={14} className="text-amber-400" />
              <span className="text-sm font-medium text-carbon-200">RCA Report — {result.equipment_tag}</span>
              <span className="ml-auto text-[10px] font-mono text-carbon-600">
                {new Date(result.generated_at).toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-carbon-400 mt-1">{result.problem_statement}</p>
          </div>

          {/* Timeline */}
          <div className="panel p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={13} className="text-carbon-400" />
              <span className="text-sm font-medium text-carbon-300">Event Timeline</span>
            </div>
            <div className="relative pl-4">
              <div className="absolute left-0 top-0 bottom-0 w-px bg-white/8" />
              {result.timeline.map((event, i) => (
                <div key={i} className="relative mb-4 last:mb-0">
                  <div className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-carbon-700 border border-white/20" />
                  <p className="text-[10px] font-mono text-carbon-600 mb-0.5">
                    {new Date(event.timestamp).toLocaleDateString('en-IN')}
                    {event.source_doc && ` · ${event.source_doc}`}
                  </p>
                  <p className="text-sm text-carbon-300">{event.event}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Root Causes */}
          <div className="panel p-5">
            <p className="text-sm font-medium text-carbon-300 mb-4">Root Causes</p>
            <div className="space-y-3">
              {result.root_causes.map((rc, i) => (
                <div key={i} className="p-3 rounded-lg bg-white/3 border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-mono font-medium uppercase ${CAUSE_COLORS[rc.category]}`}>
                      {rc.category}
                    </span>
                    <div className="flex-1 h-1 bg-carbon-800 rounded">
                      <div
                        className="h-full bg-signal-amber rounded"
                        style={{ width: `${Math.round(rc.confidence * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-carbon-500">{Math.round(rc.confidence * 100)}%</span>
                  </div>
                  <p className="text-sm text-carbon-300 mb-2">{rc.description}</p>
                  <div className="space-y-1">
                    {rc.evidence.map((e, j) => (
                      <div key={j} className="flex items-start gap-1.5">
                        <ChevronRight size={10} className="text-carbon-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-carbon-500">{e}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="panel p-5">
            <p className="text-sm font-medium text-carbon-300 mb-4">Recommendations</p>
            <div className="space-y-2">
              {result.recommendations.map((r, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${PRIORITY_COLORS[r.priority]}`}>
                  <span className="text-[10px] font-mono uppercase flex-shrink-0 mt-0.5">
                    {r.priority.replace('_', ' ')}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm">{r.action}</p>
                    {r.regulation_reference && (
                      <p className="text-[10px] font-mono opacity-60 mt-0.5">{r.regulation_reference}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Similar Incidents */}
          {result.similar_incidents.length > 0 && (
            <div className="panel p-5">
              <p className="text-sm font-medium text-carbon-300 mb-4">Similar Incidents in Knowledge Base</p>
              <div className="space-y-3">
                {result.similar_incidents.map((si, i) => (
                  <div key={i} className="p-3 rounded bg-white/2 border border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono text-carbon-600">{si.date}</span>
                      {si.equipment && <span className="badge-blue">{si.equipment}</span>}
                    </div>
                    <p className="text-xs text-carbon-400 mb-1">{si.description}</p>
                    <div className="flex items-start gap-1.5">
                      <ArrowRight size={10} className="text-signal-green flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-signal-green/80">{si.lesson_learned}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
