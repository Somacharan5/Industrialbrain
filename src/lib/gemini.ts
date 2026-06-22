import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Citation, QueryMode, RCAResult, ComplianceReport } from '@/types'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)

const MODEL = 'gemini-2.5-flash'

// ─── System Prompts ────────────────────────────────────────────────────────────

const SYSTEM_PROMPTS: Record<QueryMode, string> = {
  expert: `You are Industrial Brain, the AI knowledge system for a heavy industrial plant in India.
You have deep expertise in plant operations, process engineering, maintenance, and Indian industrial safety regulations (OISD, DGMS, Factory Act 1948, PESO).

Your job: Answer queries from plant engineers, operators, and technicians using ONLY the provided document context.
- Always cite specific documents, sections, and equipment tags
- Flag safety implications with [⚠ SAFETY] prefix
- Flag compliance issues with [📋 COMPLIANCE] prefix
- If context is insufficient, say so clearly — never hallucinate technical specifications
- Give actionable answers, not vague summaries
- When procedures conflict across documents, flag the contradiction explicitly
Format: Answer → Citations → Safety/Compliance flags → Suggested follow-up questions`,

  compliance: `You are a compliance intelligence agent for an Indian heavy industrial facility.
Regulations you enforce: OISD (Oil Industry Safety Directorate), Factory Act 1948, DGMS (Directorate General of Mines Safety), PESO, and relevant ISO/BIS standards.

For each query:
1. Identify which regulations apply
2. Check the provided documents against those regulations
3. Flag gaps, deviations, or non-conformances with severity (Critical/Major/Minor/Observation)
4. Quote the exact regulation clause and the document content that violates or satisfies it
5. Generate a corrective action with timeline
Be precise. Be thorough. Industrial compliance gaps can cost lives.`,

  rca: `You are a Root Cause Analysis (RCA) agent for industrial equipment failures and incidents.
Methodology: Modified fishbone/Ishikawa + 5-Why, aligned with RCFA best practices.

Process:
1. Build an event timeline from documents
2. Identify all contributing factors (Human, Equipment, Process, Environmental, Organizational)
3. Apply 5-Why to drill to root causes
4. Cross-reference with similar incidents in the document corpus
5. Generate ranked recommendations with regulatory compliance linkage
Output structured JSON that can be rendered as an RCA report.`,

  maintenance: `You are a predictive maintenance intelligence agent for heavy industrial equipment.
You analyze: work order history, OEM manuals, inspection records, failure patterns, operating parameters.

For each query:
1. Pull relevant maintenance history for the equipment
2. Identify failure patterns and mean time between failures
3. Check OEM-recommended maintenance intervals against actual records
4. Flag overdue or at-risk items
5. Generate an optimized maintenance schedule
6. Surface lessons from similar equipment failures
Reference Indian maintenance standards (OISD-137 for rotating equipment, etc.) where applicable.`,

  field: `You are a field assistant for plant technicians and operators.
Keep answers SHORT, PRACTICAL, and SAFE. No jargon overload.

Rules:
- Lead with the most critical safety precaution first
- Give step-by-step instructions when asked "how to"
- Always reference the exact procedure document
- For anything above routine maintenance: escalate to engineer
- Use simple language — the user may be reading on a phone in a noisy plant
Format: Safety first → Steps → What to watch for → When to call for help`,
}

// ─── Core RAG Query Function ───────────────────────────────────────────────────

export async function queryKnowledge(
  question: string,
  contextChunks: Array<{ content: string; source: string; page?: number }>,
  mode: QueryMode = 'expert',
  onChunk?: (chunk: string) => void
): Promise<{
  answer: string
  citations: Citation[]
  follow_ups: string[]
  confidence: number
}> {
  const contextBlock = contextChunks
    .map((c, i) => `[SOURCE ${i + 1}: ${c.source}${c.page ? ` p.${c.page}` : ''}]\n${c.content}`)
    .join('\n\n---\n\n')

  const userMessage = `DOCUMENT CONTEXT:
${contextBlock}

---
QUESTION: ${question}

Respond with:
1. Your answer (with inline [SOURCE N] citations)
2. A JSON block at the end in this exact format:
\`\`\`json
{
  "citations": [{"source_index": 1, "excerpt": "...", "relevance": 0.9}],
  "follow_ups": ["question 1", "question 2", "question 3"],
  "confidence": 0.85
}
\`\`\``

  const model = genAI.getGenerativeModel({ model: MODEL, systemInstruction: SYSTEM_PROMPTS[mode] })

  let fullAnswer = ''

  if (onChunk) {
    const result = await model.generateContentStream(userMessage)
    for await (const chunk of result.stream) {
      const text = chunk.text()
      fullAnswer += text
      onChunk(text)
    }
  } else {
    const result = await model.generateContent(userMessage)
    fullAnswer = result.response.text()
  }

  // Parse the JSON metadata block
  const jsonMatch = fullAnswer.match(/```json\n([\s\S]*?)\n```/)
  let metadata = { citations: [], follow_ups: [], confidence: 0.7 }
  if (jsonMatch) {
    try {
      metadata = JSON.parse(jsonMatch[1])
    } catch {
      console.warn('Failed to parse AI metadata block')
    }
  }

  const answer = fullAnswer.replace(/```json[\s\S]*?```/, '').trim()

  // Map citations back to real document references
  const citations: Citation[] = (metadata.citations as Array<{
    source_index: number
    excerpt: string
    relevance: number
  }>).map((c) => {
    const chunk = contextChunks[c.source_index - 1]
    return {
      document_id: '',
      document_title: chunk?.source ?? 'Unknown',
      chunk_index: c.source_index - 1,
      excerpt: c.excerpt,
      relevance_score: c.relevance ?? 0.8,
    }
  })

  return {
    answer,
    citations,
    follow_ups: metadata.follow_ups as string[] ?? [],
    confidence: metadata.confidence as number ?? 0.7,
  }
}

// ─── Entity Extraction ─────────────────────────────────────────────────────────

export async function extractEntities(text: string): Promise<{
  equipment_tags: string[]
  chemicals: string[]
  regulations: string[]
  procedures: string[]
  persons: string[]
  parameters: Array<{ name: string; value: string; unit: string }>
}> {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: `You extract structured entities from industrial documents. Return ONLY valid JSON. No prose.`,
  })

  const result = await model.generateContent(
    `Extract all entities from this industrial document text. Return JSON with keys:
equipment_tags (e.g. P-101, V-302, HE-205), chemicals, regulations (OISD clause refs, Factory Act sections),
procedures (SOP refs, permit numbers), persons (names/roles),
parameters (process parameters with values and units).

TEXT:
${text.slice(0, 3000)}`
  )

  const raw = result.response.text()
  try {
    const clean = raw.replace(/```json\n?|\n?```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return { equipment_tags: [], chemicals: [], regulations: [], procedures: [], persons: [], parameters: [] }
  }
}

// ─── Document Summarization ────────────────────────────────────────────────────

export async function summarizeDocument(
  text: string,
  docType: string
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: `You summarize industrial documents for an AI knowledge base. Be concise (3-4 sentences).
Focus on: what equipment/process it covers, key specifications/limits, critical safety/compliance information.`,
  })

  const result = await model.generateContent(`Document type: ${docType}\n\nSummarize this:\n${text.slice(0, 4000)}`)
  return result.response.text()
}

// ─── Compliance Analysis ───────────────────────────────────────────────────────

export async function analyzeCompliance(
  documents: Array<{ title: string; content: string; type: string }>,
  scope: string = 'all'
): Promise<ComplianceReport> {
  const docContext = documents
    .map((d) => `[${d.type.toUpperCase()}] ${d.title}:\n${d.content.slice(0, 1000)}`)
    .join('\n\n---\n\n')

  const model = genAI.getGenerativeModel({ model: MODEL, systemInstruction: SYSTEM_PROMPTS.compliance })

  const result = await model.generateContent(
    `Analyze these documents for compliance with Indian industrial regulations (OISD, Factory Act 1948, DGMS, PESO).
Scope: ${scope}

Documents:
${docContext}

Return a JSON compliance report with structure:
{
  "generated_at": "ISO timestamp",
  "total_checks": N,
  "passed": N,
  "failed": N,
  "flags": [{"severity": "critical|major|minor|observation", "regulation": "...", "description": "...", "recommended_action": "...", "status": "open"}],
  "coverage": {"oisd": 0-100, "factory_act": 0-100, "peso": 0-100, "env_norms": 0-100}
}`
  )

  const raw = result.response.text()
  try {
    const clean = raw.replace(/```json\n?|\n?```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return {
      generated_at: new Date().toISOString(),
      plant_area: undefined,
      total_checks: 0,
      passed: 0,
      failed: 0,
      flags: [],
      coverage: { oisd: 0, factory_act: 0, peso: 0, env_norms: 0 },
    }
  }
}

// ─── RCA Agent ─────────────────────────────────────────────────────────────────

export async function generateRCA(
  equipmentTag: string,
  problemStatement: string,
  contextChunks: Array<{ content: string; source: string }>,
  onChunk?: (chunk: string) => void
): Promise<RCAResult> {
  const contextBlock = contextChunks
    .map((c) => `[${c.source}]\n${c.content}`)
    .join('\n\n---\n\n')

  const prompt = `Equipment: ${equipmentTag}
Problem: ${problemStatement}

Evidence from knowledge base:
${contextBlock}

Generate a comprehensive RCA report as JSON:
{
  "equipment_tag": "${equipmentTag}",
  "problem_statement": "...",
  "timeline": [{"timestamp": "...", "event": "...", "source_doc": "..."}],
  "root_causes": [{"category": "equipment|human|process|environmental|organizational", "description": "...", "confidence": 0.9, "evidence": ["..."]}],
  "contributing_factors": ["..."],
  "recommendations": [{"priority": "immediate|short_term|long_term", "action": "...", "regulation_reference": "..."}],
  "similar_incidents": [{"date": "...", "description": "...", "lesson_learned": "..."}],
  "generated_at": "${new Date().toISOString()}"
}`

  const model = genAI.getGenerativeModel({ model: MODEL, systemInstruction: SYSTEM_PROMPTS.rca })

  let fullText = ''
  if (onChunk) {
    const result = await model.generateContentStream(prompt)
    for await (const chunk of result.stream) {
      const text = chunk.text()
      fullText += text
      onChunk(text)
    }
  } else {
    const result = await model.generateContent(prompt)
    fullText = result.response.text()
  }

  try {
    const clean = fullText.replace(/```json\n?|\n?```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return {
      equipment_tag: equipmentTag,
      problem_statement: problemStatement,
      timeline: [],
      root_causes: [],
      contributing_factors: [],
      recommendations: [],
      similar_incidents: [],
      generated_at: new Date().toISOString(),
    }
  }
}

// ─── Knowledge Decay Detector ──────────────────────────────────────────────────

export async function detectKnowledgeDecay(
  documents: Array<{
    id: string
    title: string
    doc_type: string
    updated_at: string
    equipment_tags: string[]
  }>
): Promise<Array<{ document_id: string; days_since_update: number; staleness_score: number; reason: string; risk: string }>> {
  const now = new Date()
  const results = documents.map((doc) => {
    const daysSinceUpdate = Math.floor(
      (now.getTime() - new Date(doc.updated_at).getTime()) / (1000 * 60 * 60 * 24)
    )

    // Staleness thresholds by document type
    const thresholds: Record<string, number> = {
      procedure: 365,
      regulatory: 180,
      inspection: 90,
      maintenance: 180,
      pid: 730,
      oem_manual: 1825,
      incident: 365,
      qa_record: 90,
      other: 365,
    }

    const threshold = thresholds[doc.doc_type] ?? 365
    const stalenessScore = Math.min(100, Math.round((daysSinceUpdate / threshold) * 100))

    let risk = 'low'
    let reason = 'Document is current'
    if (stalenessScore >= 90) {
      risk = 'critical'
      reason = `${doc.doc_type} document not updated in ${daysSinceUpdate} days — likely outdated`
    } else if (stalenessScore >= 70) {
      risk = 'high'
      reason = `Approaching review threshold for ${doc.doc_type}`
    } else if (stalenessScore >= 40) {
      risk = 'medium'
      reason = `Moderate staleness — review recommended`
    }

    return {
      document_id: doc.id,
      days_since_update: daysSinceUpdate,
      staleness_score: stalenessScore,
      reason,
      risk,
    }
  })

  return results.sort((a, b) => b.staleness_score - a.staleness_score)
}
