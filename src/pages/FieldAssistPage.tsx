import { useState, useRef, useCallback, useEffect } from 'react'
import { HardHat, Mic, MicOff, Send, AlertTriangle, Phone, Shield, BookOpen, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { queryKnowledge } from '@/lib/gemini'
import { DEMO_CHUNKS } from '@/lib/demo-data'
import type { ChatMessage } from '@/types'

// Safety-first quick actions
const QUICK_ACTIONS = [
  { label: 'Isolation procedure', query: 'How do I isolate equipment before maintenance? What are the key safety steps?' },
  { label: 'H2S entry protocol', query: 'What are the entry requirements and PPE for H2S hazardous areas above 10 ppm?' },
  { label: 'Permit-to-work', query: 'What permits do I need before starting hot work in a hazardous area?' },
  { label: 'Emergency contacts', query: 'What are the emergency procedures and escalation steps for a gas leak?' },
  { label: 'Fire response', query: 'What is the immediate response procedure if I discover a fire in the plant?' },
  { label: 'First aid', query: 'What is the first aid procedure for chemical burns and acid splash?' },
]

export default function FieldAssistPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Web Speech API for voice input
  const toggleVoice = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Voice input not supported in this browser. Use Chrome.')
      return
    }
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    const rec = new SpeechRecognition()
    rec.lang = 'en-IN'
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      setInput(transcript)
      setListening(false)
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    recognitionRef.current = rec
    rec.start()
    setListening(true)
  }, [listening])

  const handleSend = useCallback(async (overrideInput?: string) => {
    const question = overrideInput ?? input
    if (!question.trim() || loading) return

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
      mode: 'field',
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const assistantId = (Date.now() + 1).toString()
    setMessages(prev => [...prev, {
      id: assistantId, role: 'assistant', content: '', timestamp: new Date().toISOString(),
      mode: 'field', is_streaming: true,
    }])

    try {
      const context = DEMO_CHUNKS.filter(c =>
        question.toLowerCase().split(' ').some(w => w.length > 3 && c.content.toLowerCase().includes(w))
      ).slice(0, 4).map(c => ({ content: c.content, source: c.source }))

      if (context.length < 2) context.push(...DEMO_CHUNKS.slice(0, 3).map(c => ({ content: c.content, source: c.source })))

      let full = ''
      const result = await queryKnowledge(question, context, 'field', chunk => {
        full += chunk
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: full } : m))
      })

      setMessages(prev => prev.map(m => m.id === assistantId
        ? { ...m, content: result.answer, is_streaming: false, citations: result.citations, follow_ups: result.follow_ups }
        : m
      ))
    } catch {
      setMessages(prev => prev.map(m => m.id === assistantId
        ? { ...m, content: 'Error getting answer. Contact supervisor if urgent.', is_streaming: false }
        : m
      ))
    } finally {
      setLoading(false)
    }
  }, [input, loading])

  return (
    <div className="flex flex-col h-screen max-w-xl mx-auto">
      {/* Header — compact for mobile */}
      <div className="flex-shrink-0 h-14 flex items-center justify-between px-4 border-b border-white/5 bg-carbon-950">
        <div className="flex items-center gap-2">
          <HardHat size={16} className="text-signal-amber" />
          <span className="text-sm font-medium text-carbon-200">Field Assist</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="signal-dot bg-signal-green text-signal-green" />
          <span className="text-[10px] font-mono text-signal-green">SAFETY MODE</span>
        </div>
      </div>

      {/* Safety banner — always visible */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-amber-500/8 border-b border-amber-500/15">
        <AlertTriangle size={12} className="text-signal-amber flex-shrink-0" />
        <span className="text-[11px] text-amber-300">Safety precautions always shown first. When in doubt — stop and call supervisor.</span>
        <a href="tel:+911234567890" className="ml-auto flex items-center gap-1 text-[10px] text-signal-amber font-medium whitespace-nowrap">
          <Phone size={10} /> Emergency
        </a>
      </div>

      {/* Quick actions — shown only when no messages */}
      {messages.length === 0 && (
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-xs text-carbon-500 mb-3">Common queries — tap to ask:</p>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {QUICK_ACTIONS.map(a => (
              <button
                key={a.label}
                onClick={() => handleSend(a.query)}
                className="text-left p-3 panel hover:border-white/15 transition-all"
              >
                <Shield size={12} className="text-signal-amber mb-1.5" />
                <p className="text-xs text-carbon-300 font-medium">{a.label}</p>
              </button>
            ))}
          </div>
          <div className="panel p-3 border-amber-500/15">
            <p className="text-[10px] text-amber-400 font-medium mb-1">📋 Recall before action:</p>
            <p className="text-[10px] text-carbon-400 leading-relaxed">STOP · THINK · ACT. Never skip isolation steps. Always use buddy system in hazardous areas.</p>
          </div>
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'user' ? (
                <div className="max-w-xs bg-carbon-800 border border-white/8 rounded-2xl rounded-tr-sm px-4 py-2.5">
                  <p className="text-sm text-carbon-200">{msg.content}</p>
                </div>
              ) : (
                <div className={`max-w-sm panel p-4 rounded-2xl rounded-tl-sm ${msg.is_streaming ? '' : 'border-signal-green/15'}`}>
                  {/* Safety callout — first paragraph */}
                  {!msg.is_streaming && msg.content && (
                    <div className="flex gap-2 mb-3 pb-3 border-b border-white/5">
                      <Shield size={12} className="text-signal-amber flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-300 leading-relaxed">
                        {msg.content.split('\n')[0]}
                      </p>
                    </div>
                  )}
                  <div className={`text-sm text-carbon-300 leading-relaxed whitespace-pre-wrap ${msg.is_streaming ? 'streaming-cursor' : ''}`}>
                    {msg.is_streaming ? msg.content : msg.content.split('\n').slice(1).join('\n').trim()}
                  </div>
                  {/* Follow-ups */}
                  {!msg.is_streaming && msg.follow_ups && msg.follow_ups.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/5 flex flex-col gap-1.5">
                      {msg.follow_ups.slice(0, 2).map((q, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(q)}
                          className="text-left text-[11px] text-signal-green/70 hover:text-signal-green flex items-center gap-1.5"
                        >
                          <BookOpen size={9} />{q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t border-white/5 bg-carbon-950">
        <div className="flex gap-2 items-end">
          <button
            onClick={toggleVoice}
            className={`flex-shrink-0 h-11 w-11 rounded-xl flex items-center justify-center transition-all border
              ${listening
                ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse'
                : 'bg-carbon-900 border-white/10 text-carbon-400 hover:text-carbon-200'
              }`}
          >
            {listening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={listening ? 'Listening…' : 'Ask anything about plant safety, procedures…'}
            className="query-input flex-1 text-sm"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className={`flex-shrink-0 h-11 w-11 rounded-xl flex items-center justify-center btn-primary
              ${loading || !input.trim() ? 'opacity-40' : ''}`}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
        <p className="text-[9px] text-carbon-700 text-center mt-2 font-mono">
          Voice input available · Answers from plant knowledge base
        </p>
      </div>
    </div>
  )
}
