import { createClient } from '@supabase/supabase-js'
import type {
  Document, DocumentChunk, KnowledgeNode, KnowledgeEdge,
  ComplianceFlag, MaintenanceRecord, DashboardStats, SearchFilters,
  IngestionJob
} from '@/types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── Documents ─────────────────────────────────────────────────────────────────

export async function getDocuments(filters?: SearchFilters): Promise<Document[]> {
  let query = supabase
    .from('documents')
    .select('*')
    .order('ingested_at', { ascending: false })

  if (filters?.doc_types?.length) {
    query = query.in('doc_type', filters.doc_types)
  }
  if (filters?.equipment_tags?.length) {
    query = query.overlaps('equipment_tags', filters.equipment_tags)
  }
  if (filters?.plant_areas?.length) {
    query = query.in('plant_area', filters.plant_areas)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Document[]
}

export async function getDocument(id: string): Promise<Document> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Document
}

export async function insertDocument(doc: Partial<Document>): Promise<Document> {
  const { data, error } = await supabase
    .from('documents')
    .insert(doc)
    .select()
    .single()
  if (error) throw error
  return data as Document
}

export async function updateDocumentStatus(
  id: string,
  status: Document['status'],
  extras?: Partial<Document>
): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .update({ status, ...extras })
    .eq('id', id)
  if (error) throw error
}

// ─── Chunks ────────────────────────────────────────────────────────────────────

export async function insertChunks(chunks: Partial<DocumentChunk>[]): Promise<void> {
  const { error } = await supabase.from('document_chunks').insert(chunks)
  if (error) throw error
}

export async function vectorSearch(
  embedding: number[],
  topK = 8,
  filters?: SearchFilters
): Promise<DocumentChunk[]> {
  const { data, error } = await supabase.rpc('match_chunks', {
    query_embedding: embedding,
    match_threshold: 0.72,
    match_count: topK,
    filter_doc_types: filters?.doc_types ?? null,
    filter_equipment_tags: filters?.equipment_tags ?? null,
  })
  if (error) throw error
  return data as DocumentChunk[]
}

// ─── Knowledge Graph ───────────────────────────────────────────────────────────

export async function getKnowledgeNodes(nodeTypes?: string[]): Promise<KnowledgeNode[]> {
  let query = supabase.from('knowledge_nodes').select('*')
  if (nodeTypes?.length) query = query.in('node_type', nodeTypes)
  const { data, error } = await query
  if (error) throw error
  return data as KnowledgeNode[]
}

export async function getKnowledgeEdges(): Promise<KnowledgeEdge[]> {
  const { data, error } = await supabase
    .from('knowledge_edges')
    .select('*')
    .order('weight', { ascending: false })
  if (error) throw error
  return data as KnowledgeEdge[]
}

export async function upsertKnowledgeNode(node: Partial<KnowledgeNode>): Promise<void> {
  const { error } = await supabase
    .from('knowledge_nodes')
    .upsert(node, { onConflict: 'label,node_type' })
  if (error) throw error
}

export async function upsertKnowledgeEdge(edge: Partial<KnowledgeEdge>): Promise<void> {
  const { error } = await supabase
    .from('knowledge_edges')
    .upsert(edge, { onConflict: 'source_id,target_id,relationship' })
  if (error) throw error
}

export async function getNeighbors(nodeId: string, depth = 2): Promise<{
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
}> {
  const { data, error } = await supabase.rpc('get_graph_neighborhood', {
    start_node_id: nodeId,
    max_depth: depth,
  })
  if (error) throw error
  return data
}

// ─── Compliance ────────────────────────────────────────────────────────────────

export async function getComplianceFlags(status?: string): Promise<ComplianceFlag[]> {
  let query = supabase
    .from('compliance_flags')
    .select('*')
    .order('detected_at', { ascending: false })
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw error
  return data as ComplianceFlag[]
}

export async function upsertComplianceFlag(flag: Partial<ComplianceFlag>): Promise<void> {
  const { error } = await supabase
    .from('compliance_flags')
    .upsert(flag)
  if (error) throw error
}

export async function resolveComplianceFlag(id: string): Promise<void> {
  const { error } = await supabase
    .from('compliance_flags')
    .update({ status: 'resolved' })
    .eq('id', id)
  if (error) throw error
}

// ─── Maintenance ───────────────────────────────────────────────────────────────

export async function getMaintenanceRecords(equipmentTag?: string): Promise<MaintenanceRecord[]> {
  let query = supabase
    .from('maintenance_records')
    .select('*')
    .order('completed_at', { ascending: false })
  if (equipmentTag) query = query.eq('equipment_tag', equipmentTag)
  const { data, error } = await query
  if (error) throw error
  return data as MaintenanceRecord[]
}

// ─── Ingestion Jobs ────────────────────────────────────────────────────────────

export async function getIngestionJobs(): Promise<IngestionJob[]> {
  const { data, error } = await supabase
    .from('ingestion_jobs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return data as IngestionJob[]
}

export async function updateIngestionJob(
  id: string,
  update: Partial<IngestionJob>
): Promise<void> {
  const { error } = await supabase
    .from('ingestion_jobs')
    .update(update)
    .eq('id', id)
  if (error) throw error
}

// ─── Dashboard Stats ───────────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc('get_dashboard_stats')
  if (error) {
    // Fallback for demo mode
    return {
      total_documents: 0,
      total_chunks: 0,
      total_entities: 0,
      knowledge_graph_edges: 0,
      queries_today: 0,
      avg_response_time_ms: 0,
      compliance_score: 0,
      stale_documents: 0,
      active_flags: 0,
    }
  }
  return data as DashboardStats
}

// ─── Query History ─────────────────────────────────────────────────────────────

export async function logQuery(query: {
  question: string
  mode: string
  response_time_ms: number
  citations_count: number
}): Promise<void> {
  const { error } = await supabase.from('query_history').insert(query)
  if (error) console.warn('Failed to log query:', error)
}

export async function getQueryHistory(limit = 20) {
  const { data, error } = await supabase
    .from('query_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}
