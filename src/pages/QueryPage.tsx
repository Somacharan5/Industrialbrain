import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  MessageSquare, Send, ChevronDown, ChevronRight,
  FileText, AlertTriangle, ShieldCheck, Wrench,
  HardHat, BookOpen, Loader2, Copy, ThumbsUp, ThumbsDown
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { queryKnowledge } from '@/lib/gemini'
import { vectorSearch } from '@/lib/supabase'
import { getEmbedding } from '@/lib/ingestion'
import type { ChatMessage, QueryMode, Citation } from '@/types'
import { DEMO_CHUNKS } from '@/lib/demo-data'

const MODES: { id: QueryMode; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'expert',      label: 'Expert',     icon: <BookOpen size={12} />,      desc: 'Full knowledge base query with citations' },
  { id: 'compliance',  label: 'Compliance', icon: <ShieldCheck size={12} />,   desc: 'Regulatory gap analysis mode' },
  { id: 'rca',         label: 'RCA',        icon: <AlertTriangle size={12} />, desc: 'Root cause investigation mode' },
  { id: 'maintenance', label: 'Maint.',     icon: <Wrench size={12} />,        desc: 'Predictive maintenance mode' },
  { id: 'field',       label: 'Field',      icon: <HardHat size={12} />,       desc: 'Simple mobile-friendly mode' },
]

export default function QueryPage() {
  const [searchParams] = useSearchParams()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState(searchParams.get('q') ?? '')
  const [mode, setMode] = useState<QueryMode>('expert')
  const [loading, setLoading] = useState(false)
  const [expandedCitations, setExpandedCitations] = useState<Set<string>>(new Set())
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-run if query param present
  useEffect(() => {
    const q = searchParams.get('q')
    if (q && messages.length === 0) {
      setInput(q)
      setTimeout(() => handleSubmit(q), 100)
    }
  }, [])

  const handleSubmit = useCallback(async (overrideInput?: string) => {
    const question = overrideInput ?? input
    if (!question.trim() || loading) return

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
      mode,
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // Streaming assistant message placeholder
    const assistantId = (Date.now() + 1).toString()
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      mode,
      citations: [],
      follow_ups: [],
      is_streaming: true,
    }
    setMessages(prev => [...prev, assistantMsg])

    try {
      // 1. Get embedding & retrieve context
      let contextChunks: Array<{ content: string; source: string; page?: number }>

      if (import.meta.env.VITE_DEMO_MODE === 'true') {
        // Use demo chunks filtered by question keywords
        const keywords = question.toLowerCase().split(' ')
        contextChunks = DEMO_CHUNKS
          .filter(c => keywords.some(kw => c.content.toLowerCase().includes(kw)))
          .slice(0, 6)
          .map(c => ({ content: c.content, source: c.source }))
        // Always include at least some context
        if (contextChunks.length < 3) contextChunks = DEMO_CHUNKS.slice(0, 5).map(c => ({ content: c.content, source: c.source }))
      } else {
        const embedding = await getEmbedding(question)
        const chunks = await vectorSearch(embedding, 8)
        contextChunks = chunks.map(c => ({
          content: c.content,
          source: c.section_heading ?? `Chunk ${c.chunk_index}`,
          page: c.page_number,
        }))
      }

      // 2. Stream AI response
      let fullAnswer = ''
      const result = await queryKnowledge(
        question,
        contextChunks,
        mode,
        (chunk) => {
          fullAnswer += chunk
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, content: fullAnswer }
                : m
            )
          )
        }
      )

      // 3. Finalize
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? {
                ...m,
                content: result.answer,
                citations: result.citations,
                follow_ups: result.follow_ups,
                confidence: result.confidence,
                is_streaming: false,
              }
            : m
        )
      )
    } catch (err) {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: `Error: ${err instanceof Error ? err.message : 'Query failed'}`, is_streaming: false }
            : m
        )
      )
    } finally {
      setLoading(false)
    }
  }, [input, mode, loading, messages.length])

  const handleFollowUp = (q: string) => {
    setInput(q)
    setTimeout(() => handleSubmit(q), 50)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 h-14 flex items-center justify-between px-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <MessageSquare size={16} className="text-signal-green" />
          <span className="text-sm font-medium text-carbon-200">Expert Copilot</span>
          <span className="text-xs text-carbon-600 font-mono">RAG · Knowledge Graph · Multi-mode</span>
        </div>

        {/* Mode selector */}
        <div className="flex items-center gap-1 p-1 bg-carbon-900 rounded-lg border border-white/5">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              title={m.desc}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all duration-150
                ${mode === m.id
                  ? 'bg-signal-green/10 text-signal-green border border-signal-green/20'
                  : 'text-carbon-500 hover:text-carbon-300'
                }`}
            >
              {m.icon}
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {messages.length === 0 && <EmptyState mode={mode} onSuggest={handleFollowUp} />}
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            expandedCitations={expandedCitations}
            onToggleCitation={id => setExpandedCitations(prev => {
              const next = new Set(prev)
              next.has(id) ? next.delete(id) : next.add(id)
              return next
            })}
            onFollowUp={handleFollowUp}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t border-white/5 bg-carbon-950">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              placeholder={`Ask in ${mode} mode… (Enter to send, Shift+Enter for newline)`}
              rows={1}
              className="query-input resize-none flex-1"
              style={{ minHeight: 44, maxHeight: 120 }}
            />
            <button
              onClick={() => handleSubmit()}
              disabled={loading || !input.trim()}
              className={`btn-primary flex-shrink-0 h-11 ${loading ? 'opacity-50' : ''}`}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {loading ? 'Thinking…' : 'Send'}
            </button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] text-carbon-600 font-mono">
              Mode: {mode} · Sources: {import.meta.env.VITE_DEMO_MODE === 'true' ? 'Demo corpus' : 'Live knowledge base'}
            </p>
            <p className="text-[10px] text-carbon-700 font-mono">Powered by Claude · Industrial Brain</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Message Bubble ─────────────────────────────────────────────────────────────

function MessageBubble({
  message,
  expandedCitations,
  onToggleCitation,
  onFollowUp,
}: {
  message: ChatMessage
  expandedCitations: Set<string>
  onToggleCitation: (id: string) => void
  onFollowUp: (q: string) => void
}) {
  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-2xl bg-carbon-800 border border-white/8 rounded-xl px-4 py-3">
          <p className="text-sm text-carbon-200">{message.content}</p>
          <p className="text-[10px] text-carbon-600 font-mono mt-1">
            {new Date(message.timestamp).toLocaleTimeString()}
            {message.mode && ` · ${message.mode}`}
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl"
    >
      {/* Answer */}
      <div className="panel p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded bg-signal-green/10 border border-signal-green/20 flex items-center justify-center">
            <MessageSquare size={10} className="text-signal-green" />
          </div>
          <span className="text-[11px] text-signal-green font-mono">Industrial Brain</span>
          {message.confidence !== undefined && (
            <span className="ml-auto text-[10px] font-mono text-carbon-500">
              Confidence: {Math.round(message.confidence * 100)}%
            </span>
          )}
        </div>

        <div className={`prose prose-invert prose-sm max-w-none text-carbon-300 leading-relaxed
          ${message.is_streaming ? 'streaming-cursor' : ''}`}
        >
          <FormattedAnswer text={message.content} />
        </div>

        {/* Citations */}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <button
              onClick={() => onToggleCitation(message.id)}
              className="flex items-center gap-2 text-xs text-carbon-500 hover:text-carbon-300 transition-colors"
            >
              <FileText size={11} />
              {message.citations.length} source{message.citations.length > 1 ? 's' : ''} cited
              {expandedCitations.has(message.id)
                ? <ChevronDown size={10} />
                : <ChevronRight size={10} />
              }
            </button>
            <AnimatePresence>
              {expandedCitations.has(message.id) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-2">
                    {message.citations.map((c, i) => (
                      <CitationCard key={i} citation={c} index={i + 1} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Follow-ups */}
        {message.follow_ups && message.follow_ups.length > 0 && !message.is_streaming && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <p className="text-[10px] text-carbon-600 font-mono mb-2">SUGGESTED FOLLOW-UPS</p>
            <div className="flex flex-wrap gap-2">
              {message.follow_ups.map((q, i) => (
                <button
                  key={i}
                  onClick={() => onFollowUp(q)}
                  className="text-xs text-signal-green/70 hover:text-signal-green border border-signal-green/15
                             hover:border-signal-green/30 bg-signal-green/5 hover:bg-signal-green/10
                             px-2.5 py-1 rounded-full transition-all duration-150"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Feedback */}
        {!message.is_streaming && (
          <div className="mt-3 flex items-center gap-2">
            <button className="text-carbon-700 hover:text-carbon-400 transition-colors">
              <ThumbsUp size={12} />
            </button>
            <button className="text-carbon-700 hover:text-carbon-400 transition-colors">
              <ThumbsDown size={12} />
            </button>
            <button
              className="ml-auto text-carbon-700 hover:text-carbon-400 transition-colors"
              onClick={() => navigator.clipboard.writeText(message.content)}
            >
              <Copy size={12} />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function CitationCard({ citation, index }: { citation: Citation; index: number }) {
  return (
    <div className="p-2.5 rounded-lg bg-white/2 border border-white/5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded">
          [{index}]
        </span>
        <span className="text-xs text-carbon-400 truncate">{citation.document_title}</span>
        {citation.page_number && (
          <span className="text-[10px] font-mono text-carbon-600 ml-auto flex-shrink-0">
            p.{citation.page_number}
          </span>
        )}
      </div>
      <p className="text-xs text-carbon-500 italic leading-relaxed line-clamp-2">{citation.excerpt}</p>
      <div className="mt-1 flex items-center gap-2">
        <div className="flex-1 h-0.5 bg-carbon-800 rounded">
          <div
            className="h-full bg-blue-500/50 rounded"
            style={{ width: `${Math.round(citation.relevance_score * 100)}%` }}
          />
        </div>
        <span className="text-[10px] text-carbon-600 font-mono">
          {Math.round(citation.relevance_score * 100)}% relevant
        </span>
      </div>
    </div>
  )
}

function FormattedAnswer({ text }: { text: string }) {
  // Basic markdown-like formatting for the response
  if (!text) return null
  const lines = text.split('\n')
  return (
    <>
      {lines.map((line, i) => {
        if (line.startsWith('## ')) return <h3 key={i} className="text-carbon-200 font-medium text-sm mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('### ')) return <h4 key={i} className="text-carbon-300 font-medium text-xs mt-2 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('- ') || line.startsWith('• ')) return <div key={i} className="flex gap-2 text-sm"><span className="text-carbon-600 flex-shrink-0 mt-0.5">·</span><span>{line.slice(2)}</span></div>
        if (line.startsWith('[⚠ SAFETY]')) return <div key={i} className="text-amber-400 text-sm font-medium">{line}</div>
        if (line.startsWith('[📋 COMPLIANCE]')) return <div key={i} className="text-blue-400 text-sm font-medium">{line}</div>
        if (line.trim() === '') return <div key={i} className="h-2" />
        return <p key={i} className="text-sm">{line}</p>
      })}
    </>
  )
}

function EmptyState({ mode, onSuggest }: { mode: QueryMode; onSuggest: (q: string) => void }) {
  const suggestions: Record<QueryMode, string[]> = {
    expert: [
      'What are the safety procedures for confined space entry at compressor station C-201?',
      'Show me all maintenance records for the P-101 pump from last year',
      'Which equipment in Area 3B is overdue for inspection?',
      'What does OISD-118 say about gas detection systems?',
    ],
    compliance: [
      'Run a compliance audit on the coke oven battery procedures',
      'What Factory Act clauses apply to our permit-to-work system?',
      'List all OISD deviations found in recent inspection reports',
      'Which areas are non-compliant with PESO fire safety norms?',
    ],
    rca: [
      'Analyze the root cause of the P-101 bearing failure in March',
      'What patterns caused the heat exchanger fouling incidents?',
      'Investigate the pressure relief valve spurious trips on V-302',
    ],
    maintenance: [
      'When is the next PM due for the feed pump P-205?',
      'What are the failure patterns for our cooling tower fans?',
      'Generate a maintenance schedule for all rotating equipment in Area 2',
    ],
    field: [
      'How do I isolate the feed pump P-101?',
      'What PPE do I need for H2S area entry?',
      'Emergency shutdown steps for the compressor',
    ],
  }

  return (
    <div className="flex flex-col items-center justify-center h-full py-20 text-center">
      <div className="w-12 h-12 rounded-full bg-signal-green/10 border border-signal-green/20 flex items-center justify-center mb-4">
        <MessageSquare size={20} className="text-signal-green" />
      </div>
      <h2 className="text-lg font-semibold text-carbon-200 mb-1">Expert Copilot</h2>
      <p className="text-sm text-carbon-500 mb-6 max-w-md">
        Ask anything about plant operations, equipment, procedures, or compliance.
        The AI retrieves from your entire document corpus.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl w-full">
        {suggestions[mode].map(s => (
          <button
            key={s}
            onClick={() => onSuggest(s)}
            className="text-left text-xs text-carbon-400 hover:text-carbon-200 bg-white/3 hover:bg-white/6
                       border border-white/5 hover:border-white/10 rounded-lg p-3 transition-all duration-150"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
