import type { Document, DocumentChunk, DocType, ExtractedEntity } from '@/types'
import { extractEntities, summarizeDocument } from './gemini'
import { insertDocument, insertChunks, upsertKnowledgeNode, upsertKnowledgeEdge, updateDocumentStatus } from './supabase'

// ─── Text Extraction ───────────────────────────────────────────────────────────

export async function extractText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase()

  if (ext === 'pdf') {
    // Use pdf-parse via API route or browser-compatible extraction
    const arrayBuffer = await file.arrayBuffer()
    const uint8 = new Uint8Array(arrayBuffer)
    // Basic PDF text extraction (Claude Code will integrate pdf-parse properly)
    return `[PDF content from ${file.name} - integrate pdf-parse in Node.js pipeline]`
  }

  if (ext === 'docx') {
    const mammoth = await import('mammoth')
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.convertToHtml({ arrayBuffer })
    // Strip HTML tags
    return result.value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  }

  if (ext === 'txt' || ext === 'md') {
    return await file.text()
  }

  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
    const XLSX = await import('xlsx')
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer)
    const sheets = workbook.SheetNames.map((name) => {
      const sheet = workbook.Sheets[name]
      return `[Sheet: ${name}]\n${XLSX.utils.sheet_to_csv(sheet)}`
    })
    return sheets.join('\n\n')
  }

  throw new Error(`Unsupported file type: ${ext}`)
}

// ─── Chunking Strategy ─────────────────────────────────────────────────────────

const CHUNK_SIZE = 600     // tokens (~450 words)
const CHUNK_OVERLAP = 100  // tokens overlap between chunks

function chunkText(text: string, docType: DocType): string[] {
  const chunks: string[] = []

  // For structured docs (procedures, inspection reports) — split by section headers
  if (['procedure', 'regulatory', 'inspection'].includes(docType)) {
    const sections = text.split(/\n(?=[A-Z][A-Z\s]{3,}:|\d+\.\s|SECTION\s|CLAUSE\s|CHAPTER\s)/g)
    for (const section of sections) {
      if (section.trim().length < 50) continue
      // Sub-chunk large sections
      if (section.length > CHUNK_SIZE * 4) {
        chunks.push(...paragraphChunk(section))
      } else {
        chunks.push(section.trim())
      }
    }
    return chunks.filter(Boolean)
  }

  // Default: paragraph-based chunking with overlap
  return paragraphChunk(text)
}

function paragraphChunk(text: string): string[] {
  const paragraphs = text.split(/\n\n+/)
  const chunks: string[] = []
  let current = ''

  for (const para of paragraphs) {
    if ((current + para).length > CHUNK_SIZE * 4) {
      if (current.trim()) chunks.push(current.trim())
      // Overlap: keep last paragraph in next chunk
      current = paragraphs[paragraphs.indexOf(para) - 1]
        ? paragraphs[paragraphs.indexOf(para) - 1].slice(-CHUNK_OVERLAP * 4) + '\n\n' + para
        : para
    } else {
      current = current ? current + '\n\n' + para : para
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks
}

// ─── Embedding ─────────────────────────────────────────────────────────────────

let embeddingPipeline: ((texts: string[]) => Promise<number[][]>) | null = null

export async function getEmbedding(text: string): Promise<number[]> {
  // Use Supabase's built-in embedding via the DB function (pgvector)
  // OR use the Xenova/transformers ONNX model in-browser
  // For production, prefer a server-side embedding API call
  
  // Demo: return a deterministic mock embedding
  // Claude Code will replace this with real embedding calls
  if (import.meta.env.VITE_DEMO_MODE === 'true') {
    return mockEmbedding(text)
  }

  // Real implementation using @xenova/transformers
  if (!embeddingPipeline) {
    const { pipeline } = await import('@xenova/transformers')
    const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
    embeddingPipeline = async (texts: string[]) => {
      const output = await pipe(texts, { pooling: 'mean', normalize: true })
      return output.tolist()
    }
  }

  const result = await embeddingPipeline([text])
  return result[0]
}

function mockEmbedding(text: string): number[] {
  // Deterministic mock based on text content for demo
  const seed = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return Array.from({ length: 384 }, (_, i) => Math.sin(seed * (i + 1)) * 0.5)
}

// ─── Entity → Knowledge Graph ──────────────────────────────────────────────────

async function buildKnowledgeGraphFromEntities(
  entities: Awaited<ReturnType<typeof extractEntities>>,
  documentId: string,
  documentTitle: string
): Promise<void> {
  // Create/update nodes for each entity type
  const nodeGroups = [
    { items: entities.equipment_tags, type: 'equipment' as const },
    { items: entities.chemicals, type: 'chemical' as const },
    { items: entities.regulations, type: 'regulation' as const },
    { items: entities.procedures, type: 'procedure' as const },
    { items: entities.persons, type: 'person' as const },
  ]

  const createdNodeIds: string[] = []

  for (const group of nodeGroups) {
    for (const item of group.items) {
      if (!item || item.trim().length < 2) continue
      const nodeId = `${group.type}:${item.toLowerCase().replace(/\s+/g, '_')}`
      await upsertKnowledgeNode({
        id: nodeId,
        label: item,
        node_type: group.type,
        document_ids: [documentId],
        properties: {},
        last_updated: new Date().toISOString(),
      })
      createdNodeIds.push(nodeId)
    }
  }

  // Document node itself
  const docNodeId = `document:${documentId}`
  await upsertKnowledgeNode({
    id: docNodeId,
    label: documentTitle,
    node_type: 'document',
    document_ids: [documentId],
    properties: {},
    last_updated: new Date().toISOString(),
  })

  // Create edges: equipment ↔ regulation, equipment ↔ procedure
  const equipmentNodeIds = entities.equipment_tags.map(
    (t) => `equipment:${t.toLowerCase().replace(/\s+/g, '_')}`
  )
  const regulationNodeIds = entities.regulations.map(
    (r) => `regulation:${r.toLowerCase().replace(/\s+/g, '_')}`
  )
  const procedureNodeIds = entities.procedures.map(
    (p) => `procedure:${p.toLowerCase().replace(/\s+/g, '_')}`
  )

  for (const eqId of equipmentNodeIds) {
    for (const regId of regulationNodeIds) {
      await upsertKnowledgeEdge({
        id: `${eqId}|GOVERNED_BY|${regId}`,
        source_id: eqId,
        target_id: regId,
        relationship: 'GOVERNED_BY',
        weight: 1,
        document_ids: [documentId],
        properties: {},
      })
    }
    for (const procId of procedureNodeIds) {
      await upsertKnowledgeEdge({
        id: `${eqId}|REQUIRES|${procId}`,
        source_id: eqId,
        target_id: procId,
        relationship: 'REQUIRES',
        weight: 1,
        document_ids: [documentId],
        properties: {},
      })
    }
    // Equipment → Document
    await upsertKnowledgeEdge({
      id: `${eqId}|DOCUMENTED_IN|${docNodeId}`,
      source_id: eqId,
      target_id: docNodeId,
      relationship: 'DOCUMENTED_IN',
      weight: 1,
      document_ids: [documentId],
      properties: {},
    })
  }
}

// ─── Main Ingestion Pipeline ───────────────────────────────────────────────────

export interface IngestionOptions {
  docType: DocType
  plantArea?: string
  onProgress?: (stage: string, pct: number) => void
}

export async function ingestDocument(
  file: File,
  options: IngestionOptions
): Promise<Document> {
  const { docType, plantArea, onProgress } = options
  const emit = (stage: string, pct: number) => onProgress?.(stage, pct)

  // 1. Create document record
  emit('Creating document record…', 5)
  const doc = await insertDocument({
    title: file.name.replace(/\.[^.]+$/, ''),
    doc_type: docType,
    file_path: file.name,
    file_size: file.size,
    mime_type: file.type,
    plant_area: plantArea,
    equipment_tags: [],
    regulatory_refs: [],
    chunk_count: 0,
    ingested_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: 'processing',
    metadata: {},
  })

  try {
    // 2. Extract text
    emit('Extracting text…', 15)
    const text = await extractText(file)

    // 3. Generate summary
    emit('Generating document summary…', 25)
    const summary = await summarizeDocument(text, docType)

    // 4. Extract entities
    emit('Extracting entities…', 35)
    const entities = await extractEntities(text)

    // 5. Chunk the text
    emit('Chunking document…', 50)
    const chunks = chunkText(text, docType)

    // 6. Embed each chunk
    emit('Generating embeddings…', 60)
    const chunkRecords: Partial<DocumentChunk>[] = []
    for (let i = 0; i < chunks.length; i++) {
      emit(`Embedding chunk ${i + 1}/${chunks.length}…`, 60 + (20 * i) / chunks.length)
      const embedding = await getEmbedding(chunks[i])

      // Extract entities per chunk (lightweight)
      const chunkEntities: ExtractedEntity[] = [
        ...entities.equipment_tags.map((t) => ({
          type: 'equipment' as const,
          value: t,
          confidence: 0.9,
        })),
      ].filter((e) => chunks[i].includes(e.value))

      chunkRecords.push({
        document_id: doc.id,
        chunk_index: i,
        content: chunks[i],
        embedding,
        equipment_tags: entities.equipment_tags.filter((t) => chunks[i].includes(t)),
        entities: chunkEntities,
      })
    }

    // 7. Store chunks
    emit('Storing chunks…', 82)
    await insertChunks(chunkRecords)

    // 8. Build knowledge graph
    emit('Building knowledge graph…', 88)
    await buildKnowledgeGraphFromEntities(entities, doc.id, doc.title)

    // 9. Update document record
    emit('Finalizing…', 96)
    await updateDocumentStatus(doc.id, 'ready', {
      summary,
      equipment_tags: entities.equipment_tags,
      regulatory_refs: entities.regulations,
      chunk_count: chunks.length,
      updated_at: new Date().toISOString(),
    })

    emit('Complete', 100)
    return { ...doc, status: 'ready', summary, chunk_count: chunks.length }
  } catch (error) {
    await updateDocumentStatus(doc.id, 'error')
    throw error
  }
}

// ─── Batch Ingest (for seeding from existing file lists) ──────────────────────

export async function batchIngest(
  files: File[],
  defaultDocType: DocType = 'other',
  onFileProgress?: (fileName: string, stage: string, pct: number) => void
): Promise<Document[]> {
  const results: Document[] = []
  for (const file of files) {
    try {
      const doc = await ingestDocument(file, {
        docType: inferDocType(file.name) ?? defaultDocType,
        onProgress: (stage, pct) => onFileProgress?.(file.name, stage, pct),
      })
      results.push(doc)
    } catch (err) {
      console.error(`Failed to ingest ${file.name}:`, err)
    }
  }
  return results
}

export function inferDocType(fileName: string): DocType | null {
  const lower = fileName.toLowerCase()
  if (lower.includes('pid') || lower.includes('p&id') || lower.includes('drawing')) return 'pid'
  if (lower.includes('procedure') || lower.includes('sop') || lower.includes('wps')) return 'procedure'
  if (lower.includes('maintenance') || lower.includes('work_order') || lower.includes('wo-')) return 'maintenance'
  if (lower.includes('inspection') || lower.includes('report')) return 'inspection'
  if (lower.includes('incident') || lower.includes('near_miss') || lower.includes('accident')) return 'incident'
  if (lower.includes('oisd') || lower.includes('factory') || lower.includes('statutory')) return 'regulatory'
  if (lower.includes('manual') || lower.includes('oem')) return 'oem_manual'
  if (lower.includes('quality') || lower.includes('qms') || lower.includes('test')) return 'qa_record'
  return null
}
